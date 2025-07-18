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