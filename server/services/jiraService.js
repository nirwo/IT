const axios = require('axios');
const logger = require('../config/logger');

class JiraService {
  constructor(config) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.url,
      timeout: 30000,
      auth: {
        username: config.username,
        password: config.apiToken
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  async getIssues(jql = '', fields = [], maxResults = 100) {
    try {
      const response = await this.axiosInstance.post('/rest/api/3/search', {
        jql,
        fields: fields.length > 0 ? fields : ['summary', 'status', 'assignee', 'created', 'updated', 'priority', 'issuetype'],
        maxResults,
        startAt: 0
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch issues from Jira:', error.message);
      throw error;
    }
  }

  async getIssuesByAssignee(assigneeId, filters = {}) {
    try {
      let jql = `assignee = "${assigneeId}"`;
      
      if (filters.status) {
        jql += ` AND status = "${filters.status}"`;
      }
      
      if (filters.project) {
        jql += ` AND project = "${filters.project}"`;
      }
      
      if (filters.issueType) {
        jql += ` AND issuetype = "${filters.issueType}"`;
      }

      if (filters.dateRange) {
        jql += ` AND created >= "${filters.dateRange.start}" AND created <= "${filters.dateRange.end}"`;
      }

      const response = await this.getIssues(jql, [], filters.maxResults || 100);
      return response.issues;
    } catch (error) {
      logger.error(`Failed to fetch issues for assignee ${assigneeId}:`, error.message);
      throw error;
    }
  }

  async getProjectIssues(projectKey, filters = {}) {
    try {
      let jql = `project = "${projectKey}"`;
      
      if (filters.status) {
        jql += ` AND status = "${filters.status}"`;
      }
      
      if (filters.issueType) {
        jql += ` AND issuetype = "${filters.issueType}"`;
      }

      if (filters.dateRange) {
        jql += ` AND created >= "${filters.dateRange.start}" AND created <= "${filters.dateRange.end}"`;
      }

      const response = await this.getIssues(jql, [], filters.maxResults || 100);
      return response.issues;
    } catch (error) {
      logger.error(`Failed to fetch issues for project ${projectKey}:`, error.message);
      throw error;
    }
  }

  async getIssueDetails(issueKey) {
    try {
      const response = await this.axiosInstance.get(`/rest/api/3/issue/${issueKey}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch issue details for ${issueKey}:`, error.message);
      throw error;
    }
  }

  async getProjects() {
    try {
      const response = await this.axiosInstance.get('/rest/api/3/project');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch projects from Jira:', error.message);
      throw error;
    }
  }

  async getUsers(query = '', maxResults = 50) {
    try {
      const response = await this.axiosInstance.get('/rest/api/3/user/search', {
        params: {
          query,
          maxResults
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch users from Jira:', error.message);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const response = await this.axiosInstance.get('/rest/api/3/user/search', {
        params: {
          query: email,
          maxResults: 1
        }
      });
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      logger.error(`Failed to fetch user by email ${email}:`, error.message);
      throw error;
    }
  }

  async getIssueMetrics(dateRange, projects = []) {
    try {
      let jql = `created >= "${dateRange.start}" AND created <= "${dateRange.end}"`;
      
      if (projects.length > 0) {
        jql += ` AND project IN (${projects.map(p => `"${p}"`).join(',')})`;
      }

      const response = await this.getIssues(jql, ['status', 'priority', 'issuetype', 'assignee', 'created', 'resolutiondate'], 1000);
      return this.processIssueMetrics(response.issues);
    } catch (error) {
      logger.error('Failed to fetch issue metrics:', error.message);
      throw error;
    }
  }

  processIssueMetrics(issues) {
    const metrics = {
      total: issues.length,
      byStatus: {},
      byPriority: {},
      byIssueType: {},
      byAssignee: {},
      avgResolutionTime: 0,
      resolved: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    issues.forEach(issue => {
      const fields = issue.fields;
      
      // Count by status
      const status = fields.status.name;
      metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
      
      // Count by priority
      const priority = fields.priority ? fields.priority.name : 'None';
      metrics.byPriority[priority] = (metrics.byPriority[priority] || 0) + 1;
      
      // Count by issue type
      const issueType = fields.issuetype.name;
      metrics.byIssueType[issueType] = (metrics.byIssueType[issueType] || 0) + 1;
      
      // Count by assignee
      const assignee = fields.assignee ? fields.assignee.displayName : 'Unassigned';
      metrics.byAssignee[assignee] = (metrics.byAssignee[assignee] || 0) + 1;
      
      // Calculate resolution time
      if (fields.resolutiondate && fields.created) {
        const createdTime = new Date(fields.created);
        const resolvedTime = new Date(fields.resolutiondate);
        const resolutionTime = resolvedTime - createdTime;
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    metrics.resolved = resolvedCount;
    metrics.avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    return metrics;
  }

  async createIssue(issueData) {
    try {
      const response = await this.axiosInstance.post('/rest/api/3/issue', issueData);
      return response.data;
    } catch (error) {
      logger.error('Failed to create issue in Jira:', error.message);
      throw error;
    }
  }

  async updateIssue(issueKey, updateData) {
    try {
      const response = await this.axiosInstance.put(`/rest/api/3/issue/${issueKey}`, updateData);
      return response.data;
    } catch (error) {
      logger.error(`Failed to update issue ${issueKey}:`, error.message);
      throw error;
    }
  }

  transformIssueData(issueData) {
    const fields = issueData.fields;
    
    return {
      key: issueData.key,
      id: issueData.id,
      summary: fields.summary,
      description: fields.description,
      status: fields.status.name,
      priority: fields.priority ? fields.priority.name : 'None',
      issueType: fields.issuetype.name,
      assignee: fields.assignee ? {
        id: fields.assignee.accountId,
        displayName: fields.assignee.displayName,
        email: fields.assignee.emailAddress
      } : null,
      reporter: fields.reporter ? {
        id: fields.reporter.accountId,
        displayName: fields.reporter.displayName,
        email: fields.reporter.emailAddress
      } : null,
      created: fields.created,
      updated: fields.updated,
      resolutionDate: fields.resolutiondate
    };
  }
}

module.exports = JiraService;