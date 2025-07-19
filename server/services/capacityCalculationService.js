const Cluster = require('../models/Cluster');
const ESXiHost = require('../models/ESXiHost');
const AllocationProfile = require('../models/AllocationProfile');
const VDI = require('../models/VDI');
const UtilizationMetrics = require('../models/UtilizationMetrics');
const logger = require('../config/logger');

class CapacityCalculationService {
  constructor() {
    this.calculationInProgress = new Set();
  }

  async calculateClusterCapacity(clusterId) {
    if (this.calculationInProgress.has(clusterId)) {
      logger.warn(`Capacity calculation already in progress for cluster ${clusterId}`);
      return;
    }

    try {
      this.calculationInProgress.add(clusterId);
      logger.info(`Starting capacity calculation for cluster ${clusterId}`);

      const cluster = await Cluster.findById(clusterId);
      if (!cluster) {
        throw new Error(`Cluster ${clusterId} not found`);
      }

      // Get all active hosts in the cluster
      const hosts = await ESXiHost.find({
        cluster: clusterId,
        isActive: true,
        connectionState: 'connected',
        powerState: 'poweredOn',
        maintenanceMode: false
      });

      if (hosts.length === 0) {
        logger.warn(`No active hosts found for cluster ${clusterId}`);
        return cluster;
      }

      // Calculate total capacity from all hosts
      const totalCapacity = this.aggregateHostCapacity(hosts);
      
      // Calculate current allocations
      const currentAllocations = await this.calculateCurrentAllocations(clusterId);
      
      // Update cluster capacity
      cluster.capacity.total = totalCapacity;
      cluster.capacity.allocated = currentAllocations;
      cluster.hostCount = hosts.length;
      cluster.lastSync = new Date();
      
      // Calculate available capacity based on utilization targets
      cluster.calculateAvailableCapacity();
      
      await cluster.save();
      
      // Update allocation profiles for this cluster
      await this.updateAllocationProfiles(clusterId);
      
      logger.info(`Capacity calculation completed for cluster ${clusterId}`);
      return cluster;

    } catch (error) {
      logger.error(`Error calculating capacity for cluster ${clusterId}:`, error);
      throw error;
    } finally {
      this.calculationInProgress.delete(clusterId);
    }
  }

  aggregateHostCapacity(hosts) {
    return hosts.reduce((total, host) => {
      return {
        cpu: {
          cores: total.cpu.cores + host.capacity.cpu.cores,
          mhz: total.cpu.mhz + host.capacity.cpu.mhz
        },
        memory: {
          mb: total.memory.mb + host.capacity.memory.mb
        },
        storage: {
          gb: total.storage.gb + this.calculateHostStorageCapacity(host)
        }
      };
    }, {
      cpu: { cores: 0, mhz: 0 },
      memory: { mb: 0 },
      storage: { gb: 0 }
    });
  }

  calculateHostStorageCapacity(host) {
    if (!host.capacity.storage.datastores || host.capacity.storage.datastores.length === 0) {
      return 0;
    }
    
    return host.capacity.storage.datastores.reduce((total, datastore) => {
      return total + (datastore.capacity || 0);
    }, 0) / (1024 * 1024 * 1024); // Convert to GB
  }

  async calculateCurrentAllocations(clusterId) {
    const vdis = await VDI.find({
      status: 'active'
    }).populate('organization');

    // Filter VDIs that belong to this cluster (by checking their ESXi hosts)
    const hosts = await ESXiHost.find({ cluster: clusterId }).select('name hostname');
    const hostNames = hosts.map(h => h.name);

    const clusterVDIs = vdis.filter(vdi => hostNames.includes(vdi.esxiHost));

    return clusterVDIs.reduce((total, vdi) => {
      return {
        cpu: {
          cores: total.cpu.cores + (vdi.resourceAllocation.cpu.cores || 0),
          mhz: total.cpu.mhz + (vdi.resourceAllocation.cpu.reservedMhz || 0)
        },
        memory: {
          mb: total.memory.mb + (vdi.resourceAllocation.memory.allocated || 0)
        },
        storage: {
          gb: total.storage.gb + ((vdi.resourceAllocation.storage.allocated || 0) / (1024 * 1024))
        }
      };
    }, {
      cpu: { cores: 0, mhz: 0 },
      memory: { mb: 0 },
      storage: { gb: 0 }
    });
  }

  async updateAllocationProfiles(clusterId) {
    try {
      const profiles = await AllocationProfile.find({ cluster: clusterId, isActive: true });
      
      for (const profile of profiles) {
        await profile.calculateMaxAllocation();
        profile.lastCalculated = new Date();
        await profile.save();
      }

      logger.info(`Updated ${profiles.length} allocation profiles for cluster ${clusterId}`);
    } catch (error) {
      logger.error(`Error updating allocation profiles for cluster ${clusterId}:`, error);
    }
  }

  async generateAutomaticProfiles(clusterId) {
    try {
      logger.info(`Starting automatic profile generation for cluster ${clusterId}`);

      // Get all VDIs in this cluster
      const hosts = await ESXiHost.find({ cluster: clusterId }).select('name hostname');
      const hostNames = hosts.map(h => h.name);

      const vdis = await VDI.find({
        esxiHost: { $in: hostNames },
        status: 'active'
      });

      if (vdis.length === 0) {
        logger.info(`No VDIs found for cluster ${clusterId}`);
        return [];
      }

      // Group VDIs by similar resource specifications
      const groups = this.groupVDIsByResources(vdis);
      
      const generatedProfiles = [];

      for (const [groupKey, vdiGroup] of Object.entries(groups)) {
        if (vdiGroup.length < 2) {
          continue; // Skip groups with less than 2 VMs
        }

        const existingProfile = await AllocationProfile.findOne({
          cluster: clusterId,
          'resourceSpecs.cpu.cores': vdiGroup[0].resourceAllocation.cpu.cores,
          'resourceSpecs.memory.mb': vdiGroup[0].resourceAllocation.memory.allocated,
          isActive: true
        });

        if (!existingProfile) {
          const profile = await this.createProfileFromGroup(clusterId, vdiGroup);
          generatedProfiles.push(profile);
        } else {
          // Update existing profile with new instances
          await this.updateProfileInstances(existingProfile, vdiGroup);
        }
      }

      logger.info(`Generated ${generatedProfiles.length} automatic profiles for cluster ${clusterId}`);
      return generatedProfiles;

    } catch (error) {
      logger.error(`Error generating automatic profiles for cluster ${clusterId}:`, error);
      throw error;
    }
  }

  groupVDIsByResources(vdis, tolerance = 0.1) {
    const groups = {};

    vdis.forEach(vdi => {
      const cpu = vdi.resourceAllocation.cpu.cores;
      const memory = vdi.resourceAllocation.memory.allocated;
      const storage = Math.floor((vdi.resourceAllocation.storage.allocated || 0) / (1024 * 1024)); // Convert to GB

      // Create a key for grouping (rounded to handle minor variations)
      const key = `${cpu}c_${Math.floor(memory/1024)}gb_${storage}gb`;

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(vdi);
    });

    return groups;
  }

  async createProfileFromGroup(clusterId, vdiGroup) {
    try {
      const cluster = await Cluster.findById(clusterId);
      if (!cluster) {
        throw new Error(`Cluster ${clusterId} not found`);
      }

      const sampleVDI = vdiGroup[0];
      const cpu = sampleVDI.resourceAllocation.cpu.cores;
      const memory = sampleVDI.resourceAllocation.memory.allocated;
      const storage = Math.floor((sampleVDI.resourceAllocation.storage.allocated || 0) / (1024 * 1024));

      const profileName = `Auto-${cpu}vCPU-${Math.floor(memory/1024)}GB-${storage}GB`;

      const profile = new AllocationProfile({
        name: profileName,
        organization: cluster.organization,
        cluster: clusterId,
        resourceSpecs: {
          cpu: {
            cores: cpu,
            mhz: sampleVDI.resourceAllocation.cpu.reservedMhz || (cpu * 2000) // Estimate 2GHz per core
          },
          memory: {
            mb: memory
          },
          storage: {
            gb: storage
          }
        },
        autoGenerated: true,
        tags: ['auto-generated', 'cluster-analysis']
      });

      // Add instances to the profile
      vdiGroup.forEach(vdi => {
        profile.addInstance({
          vdiId: vdi._id,
          vmId: vdi.vmId,
          ciName: vdi.ciName,
          assignedUser: vdi.assignedUser.username,
          status: vdi.status,
          esxiHost: vdi.esxiHost
        });
      });

      // Calculate maximum allocation
      await profile.calculateMaxAllocation();

      // Calculate utilization statistics
      await this.calculateProfileUtilization(profile);

      await profile.save();
      
      logger.info(`Created automatic profile ${profileName} with ${vdiGroup.length} instances`);
      return profile;

    } catch (error) {
      logger.error('Error creating profile from VDI group:', error);
      throw error;
    }
  }

  async updateProfileInstances(profile, vdiGroup) {
    try {
      // Clear existing instances and add new ones
      profile.instances = [];
      
      vdiGroup.forEach(vdi => {
        profile.addInstance({
          vdiId: vdi._id,
          vmId: vdi.vmId,
          ciName: vdi.ciName,
          assignedUser: vdi.assignedUser.username,
          status: vdi.status,
          esxiHost: vdi.esxiHost
        });
      });

      await profile.calculateMaxAllocation();
      await this.calculateProfileUtilization(profile);
      
      profile.lastCalculated = new Date();
      await profile.save();

      logger.info(`Updated profile ${profile.name} with ${vdiGroup.length} instances`);
    } catch (error) {
      logger.error('Error updating profile instances:', error);
      throw error;
    }
  }

  async calculateProfileUtilization(profile) {
    try {
      if (profile.instances.length === 0) {
        return;
      }

      const vdiIds = profile.instances.map(inst => inst.vdiId);
      
      // Get recent utilization metrics for all VDIs in this profile
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const metrics = await UtilizationMetrics.aggregate([
        {
          $match: {
            vdiId: { $in: vdiIds },
            timestamp: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$vdiId',
            avgCpu: { $avg: '$metrics.cpu.usage' },
            avgMemory: { $avg: '$metrics.memory.usage' },
            avgStorage: { $avg: '$metrics.storage.usage' },
            maxCpu: { $max: '$metrics.cpu.usage' },
            maxMemory: { $max: '$metrics.memory.usage' },
            maxStorage: { $max: '$metrics.storage.usage' }
          }
        },
        {
          $group: {
            _id: null,
            overallAvgCpu: { $avg: '$avgCpu' },
            overallAvgMemory: { $avg: '$avgMemory' },
            overallAvgStorage: { $avg: '$avgStorage' },
            overallMaxCpu: { $max: '$maxCpu' },
            overallMaxMemory: { $max: '$maxMemory' },
            overallMaxStorage: { $max: '$maxStorage' }
          }
        }
      ]);

      if (metrics.length > 0) {
        const stats = metrics[0];
        
        profile.utilizationStats = {
          average: {
            cpu: stats.overallAvgCpu || 0,
            memory: stats.overallAvgMemory || 0,
            storage: stats.overallAvgStorage || 0
          },
          peak: {
            cpu: stats.overallMaxCpu || 0,
            memory: stats.overallMaxMemory || 0,
            storage: stats.overallMaxStorage || 0
          }
        };

        profile.calculateUtilizationEfficiency();
      }

    } catch (error) {
      logger.error('Error calculating profile utilization:', error);
    }
  }

  async getAllocationsStatus(organizationId) {
    try {
      const clusters = await Cluster.find({ organization: organizationId, isActive: true });
      const status = [];

      for (const cluster of clusters) {
        const profiles = await AllocationProfile.find({ cluster: cluster._id, isActive: true });
        
        const clusterStatus = {
          cluster: {
            id: cluster._id,
            name: cluster.name,
            capacity: cluster.capacity,
            utilization: cluster.getUtilization(),
            hostCount: cluster.hostCount
          },
          profiles: profiles.map(profile => ({
            id: profile._id,
            name: profile.name,
            resourceSpecs: profile.resourceSpecs,
            allocation: profile.allocation,
            availableSlots: profile.getAvailableSlots(),
            efficiency: profile.utilizationStats.efficiency,
            autoGenerated: profile.autoGenerated
          }))
        };

        status.push(clusterStatus);
      }

      return status;

    } catch (error) {
      logger.error('Error getting allocations status:', error);
      throw error;
    }
  }

  async getCapacityRecommendations(clusterId) {
    try {
      const cluster = await Cluster.findById(clusterId);
      const profiles = await AllocationProfile.find({ cluster: clusterId, isActive: true });
      const recommendations = [];

      if (!cluster) {
        return recommendations;
      }

      const utilization = cluster.getUtilization();

      // Check for overutilization
      if (utilization.cpu.percentage > 80) {
        recommendations.push({
          type: 'warning',
          category: 'capacity',
          message: `Cluster CPU utilization is ${utilization.cpu.percentage.toFixed(1)}%. Consider adding more hosts or migrating VMs.`,
          priority: 'high',
          action: 'scale_out'
        });
      }

      if (utilization.memory.percentage > 80) {
        recommendations.push({
          type: 'warning',
          category: 'capacity',
          message: `Cluster memory utilization is ${utilization.memory.percentage.toFixed(1)}%. Consider adding more hosts or memory.`,
          priority: 'high',
          action: 'scale_out'
        });
      }

      // Check for underutilization
      if (utilization.cpu.percentage < 30) {
        recommendations.push({
          type: 'info',
          category: 'optimization',
          message: `Cluster CPU utilization is only ${utilization.cpu.percentage.toFixed(1)}%. Consider consolidating VMs or downsizing.`,
          priority: 'medium',
          action: 'optimize'
        });
      }

      // Check for inefficient profiles
      for (const profile of profiles) {
        if (profile.utilizationStats.efficiency < 40) {
          recommendations.push({
            type: 'warning',
            category: 'efficiency',
            message: `Profile "${profile.name}" has low efficiency (${profile.utilizationStats.efficiency.toFixed(1)}%). Consider right-sizing or consolidation.`,
            priority: 'medium',
            action: 'rightsize',
            profileId: profile._id
          });
        }
      }

      return recommendations;

    } catch (error) {
      logger.error('Error getting capacity recommendations:', error);
      throw error;
    }
  }
}

module.exports = CapacityCalculationService;