const axios = require('axios');
const logger = require('../config/logger');

class ServiceNowService {
  constructor(config) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.url,
      timeout: 30000,
      auth: {
        username: config.username,
        password: config.password
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  async getIncidents(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.state) params.append('state', filters.state);
      if (filters.category) params.append('category', filters.category);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.created_on) params.append('created_on', filters.created_on);
      if (filters.limit) params.append('sysparm_limit', filters.limit);

      const response = await this.axiosInstance.get(`/api/now/table/incident?${params}`);
      return response.data.result;
    } catch (error) {
      logger.error('Failed to fetch incidents from ServiceNow:', error.message);
      throw error;
    }
  }

  async getTicketsByUser(userId, filters = {}) {
    try {
      const params = new URLSearchParams();
      params.append('assigned_to', userId);
      
      if (filters.state) params.append('state', filters.state);
      if (filters.category) params.append('category', filters.category);
      if (filters.limit) params.append('sysparm_limit', filters.limit);

      const response = await this.axiosInstance.get(`/api/now/table/incident?${params}`);
      return response.data.result;
    } catch (error) {
      logger.error(`Failed to fetch tickets for user ${userId}:`, error.message);
      throw error;
    }
  }

  async getConfigurationItems(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.name) params.append('name', filters.name);
      if (filters.category) params.append('category', filters.category);
      if (filters.operational_status) params.append('operational_status', filters.operational_status);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (filters.limit) params.append('sysparm_limit', filters.limit);

      const response = await this.axiosInstance.get(`/api/now/table/cmdb_ci?${params}`);
      return response.data.result;
    } catch (error) {
      logger.error('Failed to fetch CIs from ServiceNow:', error.message);
      throw error;
    }
  }

  async getVirtualMachinesCIs(filters = {}) {
    try {
      const params = new URLSearchParams();
      params.append('sys_class_name', 'cmdb_ci_vmware_instance');
      
      if (filters.name) params.append('name', filters.name);
      if (filters.vm_inst_id) params.append('vm_inst_id', filters.vm_inst_id);
      if (filters.vcenter_ref) params.append('vcenter_ref', filters.vcenter_ref);
      if (filters.limit) params.append('sysparm_limit', filters.limit);

      const response = await this.axiosInstance.get(`/api/now/table/cmdb_ci_vmware_instance?${params}`);
      return response.data.result;
    } catch (error) {
      logger.error('Failed to fetch VM CIs from ServiceNow:', error.message);
      throw error;
    }
  }

  async getUserDetails(userId) {
    try {
      const response = await this.axiosInstance.get(`/api/now/table/sys_user/${userId}`);
      return response.data.result;
    } catch (error) {
      logger.error(`Failed to fetch user details for ${userId}:`, error.message);
      throw error;
    }
  }

  async getUsersByDepartment(department) {
    try {
      const params = new URLSearchParams();
      params.append('department', department);
      params.append('active', 'true');
      
      const response = await this.axiosInstance.get(`/api/now/table/sys_user?${params}`);
      return response.data.result;
    } catch (error) {
      logger.error(`Failed to fetch users for department ${department}:`, error.message);
      throw error;
    }
  }

  async createIncident(incidentData) {
    try {
      const response = await this.axiosInstance.post('/api/now/table/incident', incidentData);
      return response.data.result;
    } catch (error) {
      logger.error('Failed to create incident in ServiceNow:', error.message);
      throw error;
    }
  }

  async updateIncident(incidentId, updateData) {
    try {
      const response = await this.axiosInstance.put(`/api/now/table/incident/${incidentId}`, updateData);
      return response.data.result;
    } catch (error) {
      logger.error(`Failed to update incident ${incidentId}:`, error.message);
      throw error;
    }
  }

  async getTicketMetrics(dateRange) {
    try {
      const params = new URLSearchParams();
      params.append('sysparm_query', `created_on>=${dateRange.start}^created_on<=${dateRange.end}`);
      params.append('sysparm_fields', 'number,state,priority,category,assigned_to,created_on,resolved_on');
      
      const response = await this.axiosInstance.get(`/api/now/table/incident?${params}`);
      return this.processTicketMetrics(response.data.result);
    } catch (error) {
      logger.error('Failed to fetch ticket metrics:', error.message);
      throw error;
    }
  }

  processTicketMetrics(tickets) {
    const metrics = {
      total: tickets.length,
      byState: {},
      byPriority: {},
      byCategory: {},
      avgResolutionTime: 0,
      resolved: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    tickets.forEach(ticket => {
      // Count by state
      metrics.byState[ticket.state] = (metrics.byState[ticket.state] || 0) + 1;
      
      // Count by priority
      metrics.byPriority[ticket.priority] = (metrics.byPriority[ticket.priority] || 0) + 1;
      
      // Count by category
      metrics.byCategory[ticket.category] = (metrics.byCategory[ticket.category] || 0) + 1;
      
      // Calculate resolution time
      if (ticket.resolved_on && ticket.created_on) {
        const createdTime = new Date(ticket.created_on);
        const resolvedTime = new Date(ticket.resolved_on);
        const resolutionTime = resolvedTime - createdTime;
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    metrics.resolved = resolvedCount;
    metrics.avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    return metrics;
  }

  transformCIData(ciData) {
    return {
      id: ciData.sys_id,
      name: ciData.name,
      category: ciData.category,
      operationalStatus: ciData.operational_status,
      assignedTo: ciData.assigned_to,
      location: ciData.location,
      manufacturer: ciData.manufacturer,
      model: ciData.model_number,
      serialNumber: ciData.serial_number,
      lastUpdated: ciData.sys_updated_on
    };
  }
}

module.exports = ServiceNowService;