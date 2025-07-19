const cron = require('node-cron');
const VCenterService = require('./vCenterService');
const ServiceNowService = require('./serviceNowService');
const JiraService = require('./jiraService');
const HyperVService = require('./hyperVService');
const CapacityCalculationService = require('./capacityCalculationService');
const VDI = require('../models/VDI');
const UtilizationMetrics = require('../models/UtilizationMetrics');
const UserActivity = require('../models/UserActivity');
const Organization = require('../models/Organization');
const Cluster = require('../models/Cluster');
const ESXiHost = require('../models/ESXiHost');
const AllocationProfile = require('../models/AllocationProfile');
const logger = require('../config/logger');

class DataCollectionService {
  constructor() {
    this.isCollecting = false;
    this.services = {};
    this.scheduledJobs = [];
    this.capacityService = new CapacityCalculationService();
  }

  async initializeServices() {
    try {
      const organizations = await Organization.find({ isActive: true });
      
      for (const org of organizations) {
        this.services[org._id] = {};
        
        if (org.integrations.vCenter.enabled) {
          this.services[org._id].vCenter = new VCenterService({
            url: org.integrations.vCenter.url,
            username: org.integrations.vCenter.username,
            password: org.integrations.vCenter.encryptedPassword
          });
        }

        if (org.integrations.serviceNow.enabled) {
          this.services[org._id].serviceNow = new ServiceNowService({
            url: org.integrations.serviceNow.url,
            username: org.integrations.serviceNow.username,
            password: org.integrations.serviceNow.encryptedPassword
          });
        }

        if (org.integrations.jira.enabled) {
          this.services[org._id].jira = new JiraService({
            url: org.integrations.jira.url,
            username: org.integrations.jira.username,
            apiToken: org.integrations.jira.encryptedApiToken
          });
        }

        if (org.integrations.hyperV.enabled) {
          this.services[org._id].hyperV = new HyperVService({
            host: org.integrations.hyperV.host,
            username: org.integrations.hyperV.username,
            password: org.integrations.hyperV.encryptedPassword
          });
        }
      }

      logger.info('Data collection services initialized');
    } catch (error) {
      logger.error('Failed to initialize data collection services:', error);
      throw error;
    }
  }

  async startCollection() {
    if (this.isCollecting) {
      logger.warn('Data collection is already running');
      return;
    }

    this.isCollecting = true;
    logger.info('Starting data collection service');

    const metricsInterval = process.env.COLLECTION_INTERVAL_MINUTES || 15;
    const dailyHour = process.env.DAILY_COLLECTION_HOUR || 2;

    this.scheduledJobs.push(
      cron.schedule(`*/${metricsInterval} * * * *`, async () => {
        await this.collectUtilizationMetrics();
      })
    );

    this.scheduledJobs.push(
      cron.schedule(`0 ${dailyHour} * * *`, async () => {
        await this.collectStaticData();
      })
    );

    this.scheduledJobs.push(
      cron.schedule('*/5 * * * *', async () => {
        await this.collectUserActivity();
      })
    );

    // Infrastructure collection - once daily
    this.scheduledJobs.push(
      cron.schedule(`30 ${dailyHour} * * *`, async () => {
        await this.collectInfrastructureData();
      })
    );

    // Capacity calculation - every 30 minutes
    this.scheduledJobs.push(
      cron.schedule('*/30 * * * *', async () => {
        await this.calculateCapacities();
      })
    );

    await this.collectStaticData();
    await this.collectInfrastructureData();
    logger.info('Data collection service started');
  }

  async stopCollection() {
    if (!this.isCollecting) {
      logger.warn('Data collection is not running');
      return;
    }

    this.scheduledJobs.forEach(job => job.destroy());
    this.scheduledJobs = [];
    this.isCollecting = false;
    
    logger.info('Data collection service stopped');
  }

  async collectStaticData() {
    try {
      logger.info('Starting static data collection');
      
      const organizations = await Organization.find({ isActive: true });
      
      for (const org of organizations) {
        await this.collectVDIData(org);
      }

      logger.info('Static data collection completed');
    } catch (error) {
      logger.error('Error in static data collection:', error);
    }
  }

  async collectVDIData(organization) {
    try {
      const orgServices = this.services[organization._id];
      
      if (orgServices.vCenter) {
        await this.collectVCenterData(organization, orgServices.vCenter);
      }

      if (orgServices.hyperV) {
        await this.collectHyperVData(organization, orgServices.hyperV);
      }

      if (orgServices.serviceNow) {
        await this.enrichWithServiceNowData(organization, orgServices.serviceNow);
      }

    } catch (error) {
      logger.error(`Error collecting VDI data for organization ${organization.name}:`, error);
    }
  }

  async collectVCenterData(organization, vCenterService) {
    try {
      const vms = await vCenterService.getVirtualMachines();
      
      for (const vm of vms) {
        const vmDetails = await vCenterService.getVMDetails(vm.vm);
        
        const vdiData = {
          ciName: vm.name,
          vmId: vm.vm,
          organization: organization._id,
          assignedUser: {
            username: vm.name.split('-')[0] || 'unknown',
            productGroup: 'TBD',
            groupType: 'other'
          },
          operatingSystem: {
            type: vmDetails.guest.name || 'Unknown',
            version: vmDetails.guest.fullName || 'Unknown'
          },
          resourceAllocation: {
            cpu: {
              cores: vmDetails.hardware.cpu?.count || 0,
              reservedMhz: vmDetails.hardware.cpu?.reservation || 0
            },
            memory: {
              allocated: vmDetails.hardware.memory?.size_MiB || 0,
              reservation: vmDetails.hardware.memory?.reservation || 0
            },
            storage: {
              allocated: this.calculateTotalStorage(vmDetails.hardware.disks) || 0
            }
          },
          esxiHost: vm.host,
          status: vm.power_state === 'POWERED_ON' ? 'active' : 'inactive',
          lastSeen: new Date()
        };

        await VDI.findOneAndUpdate(
          { vmId: vm.vm, organization: organization._id },
          vdiData,
          { upsert: true, new: true }
        );
      }

      logger.info(`Collected ${vms.length} VMs from vCenter for ${organization.name}`);
    } catch (error) {
      logger.error(`Error collecting vCenter data for ${organization.name}:`, error);
    }
  }

  async collectHyperVData(organization, hyperVService) {
    try {
      const vms = await hyperVService.getVirtualMachines();
      
      for (const vm of vms) {
        const vmDetails = await hyperVService.getVMDetails(vm.VMName);
        
        const vdiData = {
          ciName: vm.VMName,
          vmId: vm.VMId,
          organization: organization._id,
          assignedUser: {
            username: vm.VMName.split('-')[0] || 'unknown',
            productGroup: 'TBD',
            groupType: 'other'
          },
          operatingSystem: {
            type: 'Windows',
            version: 'Unknown'
          },
          resourceAllocation: {
            cpu: {
              cores: vmDetails.processor.Count || 0
            },
            memory: {
              allocated: vmDetails.memory.Startup || 0
            },
            storage: {
              allocated: this.calculateHyperVStorage(vmDetails.storage) || 0
            }
          },
          esxiHost: 'Hyper-V',
          status: vm.State === 'Running' ? 'active' : 'inactive',
          lastSeen: new Date()
        };

        await VDI.findOneAndUpdate(
          { vmId: vm.VMId, organization: organization._id },
          vdiData,
          { upsert: true, new: true }
        );
      }

      logger.info(`Collected ${vms.length} VMs from Hyper-V for ${organization.name}`);
    } catch (error) {
      logger.error(`Error collecting Hyper-V data for ${organization.name}:`, error);
    }
  }

  async collectUtilizationMetrics() {
    try {
      logger.info('Starting utilization metrics collection');
      
      const vdis = await VDI.find({ status: 'active' }).populate('organization');
      
      for (const vdi of vdis) {
        await this.collectVDIMetrics(vdi);
      }

      logger.info(`Collected metrics for ${vdis.length} VDIs`);
    } catch (error) {
      logger.error('Error in utilization metrics collection:', error);
    }
  }

  async collectVDIMetrics(vdi) {
    try {
      const orgServices = this.services[vdi.organization._id];
      let metrics = null;

      if (orgServices.vCenter) {
        metrics = await this.getVCenterMetrics(vdi, orgServices.vCenter);
      } else if (orgServices.hyperV) {
        metrics = await this.getHyperVMetrics(vdi, orgServices.hyperV);
      }

      if (metrics) {
        const utilizationMetrics = new UtilizationMetrics({
          vdiId: vdi._id,
          timestamp: new Date(),
          metrics: metrics,
          collectionSource: orgServices.vCenter ? 'vCenter' : 'HyperV'
        });

        await utilizationMetrics.save();
      }
    } catch (error) {
      logger.error(`Error collecting metrics for VDI ${vdi.ciName}:`, error);
    }
  }

  async getVCenterMetrics(vdi, vCenterService) {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (20 * 60 * 1000));

      const performanceData = await vCenterService.getVMPerformanceMetrics(
        vdi.vmId,
        20,
        startTime.toISOString(),
        endTime.toISOString()
      );

      return {
        cpu: {
          usage: this.extractMetricValue(performanceData, 'cpu.usage.average') || 0
        },
        memory: {
          usage: this.extractMetricValue(performanceData, 'mem.usage.average') || 0
        },
        storage: {
          usage: this.extractMetricValue(performanceData, 'disk.usage.average') || 0
        }
      };
    } catch (error) {
      logger.error(`Error getting vCenter metrics for ${vdi.ciName}:`, error);
      return null;
    }
  }

  async getHyperVMetrics(vdi, hyperVService) {
    try {
      const resourceUsage = await hyperVService.getVMResourceUsage(vdi.ciName, 1);
      
      if (resourceUsage && resourceUsage.length > 0) {
        const latest = resourceUsage[resourceUsage.length - 1];
        
        return {
          cpu: {
            usage: latest.CPU || 0
          },
          memory: {
            usage: latest.Memory ? (latest.Memory / (1024 * 1024 * 1024)) : 0
          },
          storage: {
            usage: 0
          }
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Error getting Hyper-V metrics for ${vdi.ciName}:`, error);
      return null;
    }
  }

  async collectUserActivity() {
    try {
      logger.info('Starting user activity collection');
      
      const vdis = await VDI.find({ status: 'active' }).populate('organization');
      
      for (const vdi of vdis) {
        await this.collectVDIUserActivity(vdi);
      }

      logger.info(`Collected user activity for ${vdis.length} VDIs`);
    } catch (error) {
      logger.error('Error in user activity collection:', error);
    }
  }

  async collectVDIUserActivity(vdi) {
    try {
      const lastActivity = await UserActivity.findOne({ vdiId: vdi._id })
        .sort({ timestamp: -1 });

      const sessionId = `session_${vdi.vmId}_${Date.now()}`;
      
      const activity = new UserActivity({
        vdiId: vdi._id,
        username: vdi.assignedUser.username,
        eventType: 'session_start',
        timestamp: new Date(),
        sessionId: sessionId,
        source: 'Manual'
      });

      await activity.save();
    } catch (error) {
      logger.error(`Error collecting user activity for VDI ${vdi.ciName}:`, error);
    }
  }

  calculateTotalStorage(disks) {
    if (!disks || !Array.isArray(disks)) return 0;
    
    return disks.reduce((total, disk) => {
      return total + (disk.backing?.capacity || 0);
    }, 0);
  }

  calculateHyperVStorage(storage) {
    if (!storage || !Array.isArray(storage)) return 0;
    
    return storage.reduce((total, disk) => {
      return total + (disk.Size || 0);
    }, 0);
  }

  extractMetricValue(performanceData, metricName) {
    if (!performanceData || !performanceData.samples) return null;
    
    const metric = performanceData.samples.find(sample => 
      sample.metricId && sample.metricId.includes(metricName)
    );
    
    return metric ? metric.value : null;
  }

  async enrichWithServiceNowData(organization, serviceNowService) {
    try {
      const vms = await serviceNowService.getVirtualMachinesCIs();
      
      for (const vm of vms) {
        const vdi = await VDI.findOne({
          ciName: vm.name,
          organization: organization._id
        });

        if (vdi) {
          if (vm.assigned_to) {
            const userDetails = await serviceNowService.getUserDetails(vm.assigned_to);
            if (userDetails) {
              vdi.assignedUser.email = userDetails.email;
              vdi.assignedUser.manager = userDetails.manager;
              await vdi.save();
            }
          }
        }
      }

      logger.info(`Enriched VDI data with ServiceNow for ${organization.name}`);
    } catch (error) {
      logger.error(`Error enriching with ServiceNow data for ${organization.name}:`, error);
    }
  }

  async getCollectionStatus() {
    return {
      isCollecting: this.isCollecting,
      activeJobs: this.scheduledJobs.length,
      lastCollection: await this.getLastCollectionTime(),
      totalVDIs: await VDI.countDocuments(),
      totalMetrics: await UtilizationMetrics.countDocuments(),
      totalActivities: await UserActivity.countDocuments()
    };
  }

  async getLastCollectionTime() {
    const lastMetric = await UtilizationMetrics.findOne()
      .sort({ timestamp: -1 })
      .select('timestamp');
    
    return lastMetric ? lastMetric.timestamp : null;
  }

  async collectInfrastructureData() {
    try {
      logger.info('Starting infrastructure data collection');
      
      const organizations = await Organization.find({ isActive: true });
      
      for (const org of organizations) {
        if (this.services[org._id]?.vCenter) {
          await this.collectVCenterInfrastructure(org, this.services[org._id].vCenter);
        }
      }

      logger.info('Infrastructure data collection completed');
    } catch (error) {
      logger.error('Error in infrastructure data collection:', error);
    }
  }

  async collectVCenterInfrastructure(organization, vCenterService) {
    try {
      logger.info(`Collecting vCenter infrastructure for ${organization.name}`);

      // Collect clusters
      const clusters = await vCenterService.getClusters();
      
      for (const clusterData of clusters) {
        await this.processClusterData(organization, clusterData, vCenterService);
      }

      logger.info(`Completed vCenter infrastructure collection for ${organization.name}`);
    } catch (error) {
      logger.error(`Error collecting vCenter infrastructure for ${organization.name}:`, error);
    }
  }

  async processClusterData(organization, clusterData, vCenterService) {
    try {
      const clusterDetails = await vCenterService.getClusterDetails(clusterData.cluster);
      const transformedCluster = vCenterService.transformClusterData(clusterData, clusterDetails);

      // Create or update cluster
      let cluster = await Cluster.findOne({
        vCenterId: transformedCluster.vCenterId,
        organization: organization._id
      });

      if (!cluster) {
        cluster = new Cluster({
          ...transformedCluster,
          organization: organization._id,
          capacity: {
            total: { cpu: { cores: 0, mhz: 0 }, memory: { mb: 0 }, storage: { gb: 0 } },
            allocated: { cpu: { cores: 0, mhz: 0 }, memory: { mb: 0 }, storage: { gb: 0 } },
            available: { cpu: { cores: 0, mhz: 0 }, memory: { mb: 0 }, storage: { gb: 0 } }
          }
        });
      } else {
        Object.assign(cluster, transformedCluster);
        cluster.lastSync = new Date();
      }

      await cluster.save();

      // Collect hosts for this cluster
      await this.processClusterHosts(organization, cluster, clusterData.cluster, vCenterService);

    } catch (error) {
      logger.error(`Error processing cluster ${clusterData.name}:`, error);
    }
  }

  async processClusterHosts(organization, cluster, clusterId, vCenterService) {
    try {
      const hosts = await vCenterService.getClusterHosts(clusterId);

      for (const hostData of hosts) {
        await this.processHostData(organization, cluster, hostData, vCenterService);
      }

      logger.info(`Processed ${hosts.length} hosts for cluster ${cluster.name}`);
    } catch (error) {
      logger.error(`Error processing hosts for cluster ${cluster.name}:`, error);
    }
  }

  async processHostData(organization, cluster, hostData, vCenterService) {
    try {
      const [hostDetails, performanceStats] = await Promise.all([
        vCenterService.getHostDetails(hostData.host),
        vCenterService.getHostPerformanceStats(hostData.host)
      ]);

      const transformedHost = vCenterService.transformHostData(hostData, hostDetails, performanceStats);

      // Create or update host
      let host = await ESXiHost.findOne({
        vCenterId: transformedHost.vCenterId,
        organization: organization._id
      });

      if (!host) {
        host = new ESXiHost({
          ...transformedHost,
          organization: organization._id,
          cluster: cluster._id
        });
      } else {
        Object.assign(host, transformedHost);
        host.cluster = cluster._id;
        host.lastSync = new Date();
        host.lastHeartbeat = new Date();
      }

      await host.save();

      // Get VM count for this host
      const vms = await vCenterService.getVMsByHost(hostData.host);
      host.vmCount = {
        total: vms.length,
        poweredOn: vms.filter(vm => vm.power_state === 'POWERED_ON').length
      };

      await host.save();

    } catch (error) {
      logger.error(`Error processing host ${hostData.name}:`, error);
    }
  }

  async calculateCapacities() {
    try {
      logger.info('Starting capacity calculations');

      const clusters = await Cluster.find({ isActive: true });

      for (const cluster of clusters) {
        try {
          await this.capacityService.calculateClusterCapacity(cluster._id);
          
          // Generate automatic profiles
          await this.capacityService.generateAutomaticProfiles(cluster._id);
          
        } catch (error) {
          logger.error(`Error calculating capacity for cluster ${cluster.name}:`, error);
        }
      }

      logger.info('Capacity calculations completed');
    } catch (error) {
      logger.error('Error in capacity calculations:', error);
    }
  }

  async getInfrastructureStatus() {
    try {
      const [clusters, hosts, profiles] = await Promise.all([
        Cluster.countDocuments({ isActive: true }),
        ESXiHost.countDocuments({ isActive: true }),
        AllocationProfile.countDocuments({ isActive: true })
      ]);

      const lastInfraSync = await Cluster.findOne()
        .sort({ lastSync: -1 })
        .select('lastSync');

      return {
        clusters,
        hosts,
        profiles,
        lastInfrastructureSync: lastInfraSync ? lastInfraSync.lastSync : null
      };
    } catch (error) {
      logger.error('Error getting infrastructure status:', error);
      return {
        clusters: 0,
        hosts: 0,
        profiles: 0,
        lastInfrastructureSync: null
      };
    }
  }
}

module.exports = DataCollectionService;