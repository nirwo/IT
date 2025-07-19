const axios = require('axios');
const https = require('https');
const logger = require('../config/logger');

class VCenterService {
  constructor(config) {
    this.config = config;
    this.sessionId = null;
    this.axiosInstance = axios.create({
      baseURL: config.url,
      timeout: 30000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
  }

  async authenticate() {
    try {
      const response = await this.axiosInstance.post('/rest/com/vmware/cis/session', {}, {
        auth: {
          username: this.config.username,
          password: this.config.password
        }
      });

      this.sessionId = response.data.value;
      this.axiosInstance.defaults.headers.common['vmware-api-session-id'] = this.sessionId;
      
      logger.info('vCenter authentication successful');
      return true;
    } catch (error) {
      logger.error('vCenter authentication failed:', error.message);
      throw new Error('vCenter authentication failed');
    }
  }

  async getVirtualMachines() {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const response = await this.axiosInstance.get('/rest/vcenter/vm');
      return response.data.value;
    } catch (error) {
      logger.error('Failed to fetch VMs from vCenter:', error.message);
      throw error;
    }
  }

  async getVMDetails(vmId) {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const [vmInfo, hardware, guestInfo] = await Promise.all([
        this.axiosInstance.get(`/rest/vcenter/vm/${vmId}`),
        this.axiosInstance.get(`/rest/vcenter/vm/${vmId}/hardware`),
        this.axiosInstance.get(`/rest/vcenter/vm/${vmId}/guest/identity`)
      ]);

      return {
        info: vmInfo.data.value,
        hardware: hardware.data.value,
        guest: guestInfo.data.value
      };
    } catch (error) {
      logger.error(`Failed to fetch VM details for ${vmId}:`, error.message);
      throw error;
    }
  }

  async getVMPerformanceMetrics(vmId, intervalId = 20, startTime, endTime) {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const metrics = [
        'cpu.usage.average',
        'mem.usage.average',
        'disk.usage.average',
        'net.usage.average'
      ];

      const querySpec = {
        entity: { type: 'VirtualMachine', value: vmId },
        intervalId,
        startTime,
        endTime,
        metricId: metrics.map(metric => ({ counterId: metric, instance: '*' }))
      };

      const response = await this.axiosInstance.post('/rest/vcenter/vm/performance', querySpec);
      return response.data.value;
    } catch (error) {
      logger.error(`Failed to fetch performance metrics for VM ${vmId}:`, error.message);
      throw error;
    }
  }

  async getESXiHosts() {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const response = await this.axiosInstance.get('/rest/vcenter/host');
      return response.data.value;
    } catch (error) {
      logger.error('Failed to fetch ESXi hosts:', error.message);
      throw error;
    }
  }

  async getHostDetails(hostId) {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const [hostInfo, hardware, summary] = await Promise.all([
        this.axiosInstance.get(`/rest/vcenter/host/${hostId}`),
        this.axiosInstance.get(`/rest/vcenter/host/${hostId}/hardware`),
        this.axiosInstance.get(`/rest/vcenter/host/${hostId}/summary`)
      ]);

      return {
        info: hostInfo.data.value,
        hardware: hardware.data.value,
        summary: summary.data.value
      };
    } catch (error) {
      logger.error(`Failed to fetch host details for ${hostId}:`, error.message);
      throw error;
    }
  }

  async getClusters() {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const response = await this.axiosInstance.get('/rest/vcenter/cluster');
      return response.data.value;
    } catch (error) {
      logger.error('Failed to fetch clusters:', error.message);
      throw error;
    }
  }

  async getClusterDetails(clusterId) {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const [clusterInfo, summary] = await Promise.all([
        this.axiosInstance.get(`/rest/vcenter/cluster/${clusterId}`),
        this.axiosInstance.get(`/rest/vcenter/cluster/${clusterId}/summary`)
      ]);

      return {
        info: clusterInfo.data.value,
        summary: summary.data.value
      };
    } catch (error) {
      logger.error(`Failed to fetch cluster details for ${clusterId}:`, error.message);
      throw error;
    }
  }

  async getClusterHosts(clusterId) {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const response = await this.axiosInstance.get(`/rest/vcenter/host?filter.clusters=${clusterId}`);
      return response.data.value;
    } catch (error) {
      logger.error(`Failed to fetch hosts for cluster ${clusterId}:`, error.message);
      throw error;
    }
  }

  async getHostPerformanceStats(hostId) {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (60 * 60 * 1000)); // Last hour

      const metrics = [
        'cpu.usage.average',
        'cpu.ready.summation',
        'mem.usage.average',
        'mem.consumed.average',
        'mem.active.average',
        'net.usage.average',
        'datastore.numberReadAveraged.average',
        'datastore.numberWriteAveraged.average'
      ];

      const querySpec = {
        entity: { type: 'HostSystem', value: hostId },
        intervalId: 20, // 20 second intervals
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        metricId: metrics.map(metric => ({ counterId: metric, instance: '*' }))
      };

      const response = await this.axiosInstance.post('/rest/vcenter/host/performance', querySpec);
      return this.processPerformanceStats(response.data.value);
    } catch (error) {
      logger.error(`Failed to fetch performance stats for host ${hostId}:`, error.message);
      return this.getDefaultPerformanceStats();
    }
  }

  processPerformanceStats(performanceData) {
    if (!performanceData || !performanceData.samples) {
      return this.getDefaultPerformanceStats();
    }

    const stats = {
      cpu: {
        usage: this.extractLatestMetricValue(performanceData, 'cpu.usage.average') || 0,
        ready: this.extractLatestMetricValue(performanceData, 'cpu.ready.summation') || 0
      },
      memory: {
        usage: this.extractLatestMetricValue(performanceData, 'mem.usage.average') || 0,
        consumed: this.extractLatestMetricValue(performanceData, 'mem.consumed.average') || 0,
        active: this.extractLatestMetricValue(performanceData, 'mem.active.average') || 0
      },
      network: {
        usage: this.extractLatestMetricValue(performanceData, 'net.usage.average') || 0
      },
      storage: {
        readOps: this.extractLatestMetricValue(performanceData, 'datastore.numberReadAveraged.average') || 0,
        writeOps: this.extractLatestMetricValue(performanceData, 'datastore.numberWriteAveraged.average') || 0
      }
    };

    return stats;
  }

  getDefaultPerformanceStats() {
    return {
      cpu: { usage: 0, ready: 0 },
      memory: { usage: 0, consumed: 0, active: 0 },
      network: { usage: 0 },
      storage: { readOps: 0, writeOps: 0 }
    };
  }

  extractLatestMetricValue(performanceData, metricName) {
    if (!performanceData || !performanceData.samples) return null;
    
    const metricSamples = performanceData.samples.filter(sample => 
      sample.metricId && sample.metricId.includes(metricName)
    );
    
    if (metricSamples.length === 0) return null;
    
    // Get the latest value
    const latestSample = metricSamples[metricSamples.length - 1];
    return latestSample.value;
  }

  transformHostData(hostData, hostDetails, performanceStats) {
    const host = hostDetails.info;
    const hardware = hostDetails.hardware;
    const summary = hostDetails.summary;

    return {
      vCenterId: hostData.host,
      name: hostData.name,
      hostname: host.name,
      hardware: {
        vendor: hardware.vendor,
        model: hardware.model,
        serialNumber: hardware.serialNumber,
        processorType: hardware.cpuModel,
        biosVersion: hardware.biosVersion
      },
      capacity: {
        cpu: {
          cores: hardware.cpuCores || 0,
          threads: hardware.cpuThreads || 0,
          mhz: hardware.cpuMhz || 0,
          sockets: hardware.cpuSockets || 0
        },
        memory: {
          mb: hardware.memoryMB || 0
        },
        storage: {
          datastores: hardware.datastores || []
        }
      },
      utilization: {
        cpu: {
          usage: performanceStats.cpu.usage,
          ready: performanceStats.cpu.ready
        },
        memory: {
          usage: performanceStats.memory.usage,
          consumed: performanceStats.memory.consumed,
          active: performanceStats.memory.active
        },
        network: {
          usage: performanceStats.network.usage
        }
      },
      connectionState: summary.connectionState || 'connected',
      powerState: summary.powerState || 'poweredOn',
      maintenanceMode: summary.inMaintenanceMode || false,
      version: {
        name: summary.productName,
        version: summary.productVersion,
        build: summary.productBuild,
        fullName: summary.productFullName
      }
    };
  }

  transformClusterData(clusterData, clusterDetails) {
    const cluster = clusterDetails.info;
    const summary = clusterDetails.summary;

    return {
      vCenterId: clusterData.cluster,
      name: clusterData.name,
      configuration: {
        drsEnabled: cluster.drsEnabled || false,
        haEnabled: cluster.haEnabled || false,
        vsanEnabled: cluster.vsanEnabled || false
      }
    };
  }

  async getVMsByHost(hostId) {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const response = await this.axiosInstance.get(`/rest/vcenter/vm?filter.hosts=${hostId}`);
      return response.data.value;
    } catch (error) {
      logger.error(`Failed to fetch VMs for host ${hostId}:`, error.message);
      throw error;
    }
  }

  async getDatastores() {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const response = await this.axiosInstance.get('/rest/vcenter/datastore');
      return response.data.value;
    } catch (error) {
      logger.error('Failed to fetch datastores:', error.message);
      throw error;
    }
  }

  async getResourcePools() {
    try {
      if (!this.sessionId) {
        await this.authenticate();
      }

      const response = await this.axiosInstance.get('/rest/vcenter/resource-pool');
      return response.data.value;
    } catch (error) {
      logger.error('Failed to fetch resource pools:', error.message);
      throw error;
    }
  }

  async logout() {
    try {
      if (this.sessionId) {
        await this.axiosInstance.delete('/rest/com/vmware/cis/session');
        this.sessionId = null;
        delete this.axiosInstance.defaults.headers.common['vmware-api-session-id'];
        logger.info('vCenter session logged out');
      }
    } catch (error) {
      logger.error('Failed to logout from vCenter:', error.message);
    }
  }

  transformVMData(vmData, vmDetails) {
    return {
      vmId: vmData.vm,
      name: vmData.name,
      powerState: vmData.power_state,
      cpuCount: vmDetails.hardware.cpu?.count || 0,
      memoryMB: vmDetails.hardware.memory?.size_MiB || 0,
      guestOS: vmDetails.guest?.name || 'Unknown',
      host: vmData.host,
      resourcePool: vmData.resource_pool,
      folder: vmData.folder
    };
  }
}

module.exports = VCenterService;