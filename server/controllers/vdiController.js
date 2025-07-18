const VDI = require('../models/VDI');
const UtilizationMetrics = require('../models/UtilizationMetrics');
const UserActivity = require('../models/UserActivity');
const logger = require('../config/logger');
const Joi = require('joi');

const getVDIs = async (req, res) => {
  try {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sortBy: Joi.string().valid('ciName', 'assignedUser.username', 'operatingSystem.type', 'esxiHost', 'lastSeen').default('ciName'),
      sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
      search: Joi.string().allow(''),
      status: Joi.string().valid('active', 'inactive', 'provisioning', 'maintenance'),
      osType: Joi.string(),
      esxiHost: Joi.string(),
      assignedUser: Joi.string()
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { page, limit, sortBy, sortOrder, search, status, osType, esxiHost, assignedUser } = value;

    let query = { organization: req.user.organization._id };

    if (req.user.organization.type !== 'admin') {
      query.organization = req.user.organization._id;
    }

    if (status) query.status = status;
    if (osType) query['operatingSystem.type'] = new RegExp(osType, 'i');
    if (esxiHost) query.esxiHost = new RegExp(esxiHost, 'i');
    if (assignedUser) query['assignedUser.username'] = new RegExp(assignedUser, 'i');

    if (search) {
      query.$or = [
        { ciName: new RegExp(search, 'i') },
        { 'assignedUser.username': new RegExp(search, 'i') },
        { 'assignedUser.email': new RegExp(search, 'i') },
        { 'operatingSystem.type': new RegExp(search, 'i') }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [vdis, total] = await Promise.all([
      VDI.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('profile', 'name description')
        .lean(),
      VDI.countDocuments(query)
    ]);

    const vdisWithMetrics = await Promise.all(
      vdis.map(async (vdi) => {
        const [latestMetrics, activityCount] = await Promise.all([
          UtilizationMetrics.findOne({ vdiId: vdi._id })
            .sort({ timestamp: -1 })
            .limit(1)
            .lean(),
          UserActivity.countDocuments({
            vdiId: vdi._id,
            timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          })
        ]);

        return {
          ...vdi,
          latestMetrics: latestMetrics ? latestMetrics.metrics : null,
          activityCount
        };
      })
    );

    res.json({
      vdis: vdisWithMetrics,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching VDIs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getVDI = async (req, res) => {
  try {
    const { id } = req.params;

    const vdi = await VDI.findById(id)
      .populate('profile', 'name description resourceSpecs')
      .populate('organization', 'name type');

    if (!vdi) {
      return res.status(404).json({ error: 'VDI not found' });
    }

    if (req.user.organization.type !== 'admin' && 
        vdi.organization._id.toString() !== req.user.organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [recentMetrics, recentActivity] = await Promise.all([
      UtilizationMetrics.find({ vdiId: id })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean(),
      UserActivity.find({ vdiId: id })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean()
    ]);

    res.json({
      vdi,
      recentMetrics,
      recentActivity
    });
  } catch (error) {
    logger.error('Error fetching VDI:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getVDIMetrics = async (req, res) => {
  try {
    const schema = Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().required(),
      interval: Joi.string().valid('hour', 'day', 'week').default('hour')
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { startDate, endDate, interval } = value;
    const { id } = req.params;

    const vdi = await VDI.findById(id);
    if (!vdi) {
      return res.status(404).json({ error: 'VDI not found' });
    }

    if (req.user.organization.type !== 'admin' && 
        vdi.organization.toString() !== req.user.organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const metrics = await UtilizationMetrics.find({
      vdiId: id,
      timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).sort({ timestamp: 1 }).lean();

    const processedMetrics = processMetricsByInterval(metrics, interval);

    res.json({
      metrics: processedMetrics,
      interval,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Error fetching VDI metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getVDIActivity = async (req, res) => {
  try {
    const schema = Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().required(),
      eventType: Joi.string().valid('login', 'logout', 'session_start', 'session_end', 'disconnect', 'reconnect')
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { startDate, endDate, eventType } = value;
    const { id } = req.params;

    const vdi = await VDI.findById(id);
    if (!vdi) {
      return res.status(404).json({ error: 'VDI not found' });
    }

    if (req.user.organization.type !== 'admin' && 
        vdi.organization.toString() !== req.user.organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = {
      vdiId: id,
      timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (eventType) {
      query.eventType = eventType;
    }

    const activities = await UserActivity.find(query)
      .sort({ timestamp: -1 })
      .limit(1000)
      .lean();

    const activitySummary = processActivitySummary(activities);

    res.json({
      activities,
      summary: activitySummary,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Error fetching VDI activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUtilizationSummary = async (req, res) => {
  try {
    const schema = Joi.object({
      dateRange: Joi.number().integer().min(1).max(365).default(30)
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { dateRange } = value;
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);

    let organizationQuery = {};
    if (req.user.organization.type !== 'admin') {
      organizationQuery = { organization: req.user.organization._id };
    }

    const vdis = await VDI.find(organizationQuery).lean();
    const vdiIds = vdis.map(v => v._id);

    const [metrics, activities] = await Promise.all([
      UtilizationMetrics.find({
        vdiId: { $in: vdiIds },
        timestamp: { $gte: startDate }
      }).lean(),
      UserActivity.find({
        vdiId: { $in: vdiIds },
        timestamp: { $gte: startDate }
      }).lean()
    ]);

    const summary = calculateUtilizationSummary(vdis, metrics, activities);

    res.json(summary);
  } catch (error) {
    logger.error('Error fetching utilization summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateVDI = async (req, res) => {
  try {
    const schema = Joi.object({
      assignedUser: Joi.object({
        username: Joi.string(),
        email: Joi.string().email(),
        manager: Joi.string(),
        productGroup: Joi.string(),
        groupType: Joi.string().valid('SW', 'dev-ops', 'QA', 'UX', 'application', 'other')
      }),
      profile: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
      status: Joi.string().valid('active', 'inactive', 'provisioning', 'maintenance')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { id } = req.params;
    const vdi = await VDI.findById(id);

    if (!vdi) {
      return res.status(404).json({ error: 'VDI not found' });
    }

    if (req.user.organization.type !== 'admin' && 
        vdi.organization.toString() !== req.user.organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedVDI = await VDI.findByIdAndUpdate(
      id,
      { $set: value },
      { new: true, runValidators: true }
    ).populate('profile', 'name description');

    logger.info(`VDI ${vdi.ciName} updated by ${req.user.username}`);

    res.json(updatedVDI);
  } catch (error) {
    logger.error('Error updating VDI:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function processMetricsByInterval(metrics, interval) {
  const groupedMetrics = {};
  
  metrics.forEach(metric => {
    let key;
    const date = new Date(metric.timestamp);
    
    switch (interval) {
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        break;
      case 'week':
        const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
        break;
      default:
        key = metric.timestamp;
    }
    
    if (!groupedMetrics[key]) {
      groupedMetrics[key] = [];
    }
    
    groupedMetrics[key].push(metric);
  });

  const processedMetrics = Object.keys(groupedMetrics).map(key => {
    const groupMetrics = groupedMetrics[key];
    const avgMetrics = {
      timestamp: groupMetrics[0].timestamp,
      cpu: {
        usage: groupMetrics.reduce((sum, m) => sum + (m.metrics.cpu?.usage || 0), 0) / groupMetrics.length
      },
      memory: {
        usage: groupMetrics.reduce((sum, m) => sum + (m.metrics.memory?.usage || 0), 0) / groupMetrics.length
      },
      storage: {
        usage: groupMetrics.reduce((sum, m) => sum + (m.metrics.storage?.usage || 0), 0) / groupMetrics.length
      }
    };
    
    return avgMetrics;
  });

  return processedMetrics.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function processActivitySummary(activities) {
  const summary = {
    totalSessions: 0,
    totalLoginTime: 0,
    averageSessionDuration: 0,
    eventsByType: {},
    dailyActivity: {}
  };

  const sessions = {};
  
  activities.forEach(activity => {
    const eventType = activity.eventType;
    summary.eventsByType[eventType] = (summary.eventsByType[eventType] || 0) + 1;
    
    const dateKey = new Date(activity.timestamp).toDateString();
    if (!summary.dailyActivity[dateKey]) {
      summary.dailyActivity[dateKey] = 0;
    }
    summary.dailyActivity[dateKey]++;
    
    if (eventType === 'login' || eventType === 'session_start') {
      sessions[activity.sessionId] = { start: activity.timestamp };
    } else if (eventType === 'logout' || eventType === 'session_end') {
      if (sessions[activity.sessionId]) {
        sessions[activity.sessionId].end = activity.timestamp;
      }
    }
  });

  let totalDuration = 0;
  let sessionCount = 0;
  
  Object.values(sessions).forEach(session => {
    if (session.start && session.end) {
      const duration = new Date(session.end) - new Date(session.start);
      totalDuration += duration;
      sessionCount++;
    }
  });

  summary.totalSessions = sessionCount;
  summary.totalLoginTime = totalDuration;
  summary.averageSessionDuration = sessionCount > 0 ? totalDuration / sessionCount : 0;

  return summary;
}

function calculateUtilizationSummary(vdis, metrics, activities) {
  const summary = {
    totalVDIs: vdis.length,
    activeVDIs: vdis.filter(v => v.status === 'active').length,
    inactiveVDIs: vdis.filter(v => v.status === 'inactive').length,
    utilizationStats: {
      highUtilization: 0,
      mediumUtilization: 0,
      lowUtilization: 0,
      idle: 0
    },
    resourceAllocation: {
      totalCPU: 0,
      totalMemory: 0,
      totalStorage: 0
    },
    activityStats: {
      totalLogins: activities.filter(a => a.eventType === 'login').length,
      uniqueUsers: new Set(activities.map(a => a.username)).size,
      averageSessionsPerDay: 0
    }
  };

  vdis.forEach(vdi => {
    summary.resourceAllocation.totalCPU += vdi.resourceAllocation.cpu.cores || 0;
    summary.resourceAllocation.totalMemory += vdi.resourceAllocation.memory.allocated || 0;
    summary.resourceAllocation.totalStorage += vdi.resourceAllocation.storage.allocated || 0;
  });

  const utilizationByVDI = {};
  metrics.forEach(metric => {
    const vdiId = metric.vdiId.toString();
    if (!utilizationByVDI[vdiId]) {
      utilizationByVDI[vdiId] = [];
    }
    utilizationByVDI[vdiId].push(metric);
  });

  Object.keys(utilizationByVDI).forEach(vdiId => {
    const vdiMetrics = utilizationByVDI[vdiId];
    const avgCPU = vdiMetrics.reduce((sum, m) => sum + (m.metrics.cpu?.usage || 0), 0) / vdiMetrics.length;
    
    if (avgCPU > 70) {
      summary.utilizationStats.highUtilization++;
    } else if (avgCPU > 30) {
      summary.utilizationStats.mediumUtilization++;
    } else if (avgCPU > 5) {
      summary.utilizationStats.lowUtilization++;
    } else {
      summary.utilizationStats.idle++;
    }
  });

  return summary;
}

module.exports = {
  getVDIs,
  getVDI,
  getVDIMetrics,
  getVDIActivity,
  getUtilizationSummary,
  updateVDI
};