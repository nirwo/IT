const VDIProfile = require('../models/VDIProfile');
const VDI = require('../models/VDI');
const logger = require('../config/logger');
const Joi = require('joi');

const getProfiles = async (req, res) => {
  try {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sortBy: Joi.string().valid('name', 'targetAudience', 'createdAt', 'updatedAt').default('name'),
      sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
      search: Joi.string().allow(''),
      targetAudience: Joi.string().valid('developer', 'designer', 'analyst', 'general', 'power-user'),
      isActive: Joi.boolean(),
      isTemplate: Joi.boolean()
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { page, limit, sortBy, sortOrder, search, targetAudience, isActive, isTemplate } = value;

    let query = {};
    if (req.user.organization.type !== 'admin') {
      query.organization = req.user.organization._id;
    }

    if (targetAudience) query.targetAudience = targetAudience;
    if (typeof isActive === 'boolean') query.isActive = isActive;
    if (typeof isTemplate === 'boolean') query.isTemplate = isTemplate;

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      VDIProfile.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username email')
        .populate('organization', 'name type')
        .lean(),
      VDIProfile.countDocuments(query)
    ]);

    const profilesWithUsage = await Promise.all(
      profiles.map(async (profile) => {
        const activeInstances = await VDI.countDocuments({
          profile: profile._id,
          status: 'active'
        });
        
        const totalInstances = await VDI.countDocuments({
          profile: profile._id
        });

        return {
          ...profile,
          usage: {
            totalInstances,
            activeInstances
          }
        };
      })
    );

    res.json({
      profiles: profilesWithUsage,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await VDIProfile.findById(id)
      .populate('createdBy', 'username email')
      .populate('organization', 'name type');

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (req.user.organization.type !== 'admin' && 
        profile.organization._id.toString() !== req.user.organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [activeInstances, totalInstances, recentVDIs] = await Promise.all([
      VDI.countDocuments({ profile: id, status: 'active' }),
      VDI.countDocuments({ profile: id }),
      VDI.find({ profile: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('ciName assignedUser status createdAt')
        .lean()
    ]);

    res.json({
      profile,
      usage: {
        totalInstances,
        activeInstances,
        recentVDIs
      }
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createProfile = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required().trim().min(1).max(100),
      description: Joi.string().allow('').trim().max(500),
      resourceSpecs: Joi.object({
        cpu: Joi.object({
          cores: Joi.number().integer().min(1).max(32).required(),
          reservedMhz: Joi.number().min(0).default(0)
        }).required(),
        memory: Joi.object({
          allocated: Joi.number().integer().min(1024).required(),
          reservation: Joi.number().min(0).default(0)
        }).required(),
        storage: Joi.object({
          allocated: Joi.number().integer().min(20480).required(),
          type: Joi.string().valid('SSD', 'HDD', 'NVMe').default('SSD')
        }).required(),
        gpu: Joi.object({
          allocated: Joi.number().integer().min(0).default(0),
          type: Joi.string().valid('NVIDIA', 'AMD', 'Intel', 'None').default('None')
        }).default({ allocated: 0, type: 'None' })
      }).required(),
      operatingSystem: Joi.object({
        type: Joi.string().valid('Windows', 'Linux', 'macOS').required(),
        version: Joi.string().allow(''),
        template: Joi.string().allow('')
      }).required(),
      targetAudience: Joi.string().valid('developer', 'designer', 'analyst', 'general', 'power-user').default('general'),
      isTemplate: Joi.boolean().default(false),
      tags: Joi.array().items(Joi.string().trim()).default([])
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const existingProfile = await VDIProfile.findOne({
      name: value.name,
      organization: req.user.organization._id
    });

    if (existingProfile) {
      return res.status(409).json({ error: 'Profile with this name already exists' });
    }

    const profile = new VDIProfile({
      ...value,
      organization: req.user.organization._id,
      createdBy: req.user._id
    });

    await profile.save();

    const populatedProfile = await VDIProfile.findById(profile._id)
      .populate('createdBy', 'username email')
      .populate('organization', 'name type');

    logger.info(`Profile "${profile.name}" created by ${req.user.username}`);

    res.status(201).json(populatedProfile);
  } catch (error) {
    logger.error('Error creating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().trim().min(1).max(100),
      description: Joi.string().allow('').trim().max(500),
      resourceSpecs: Joi.object({
        cpu: Joi.object({
          cores: Joi.number().integer().min(1).max(32),
          reservedMhz: Joi.number().min(0)
        }),
        memory: Joi.object({
          allocated: Joi.number().integer().min(1024),
          reservation: Joi.number().min(0)
        }),
        storage: Joi.object({
          allocated: Joi.number().integer().min(20480),
          type: Joi.string().valid('SSD', 'HDD', 'NVMe')
        }),
        gpu: Joi.object({
          allocated: Joi.number().integer().min(0),
          type: Joi.string().valid('NVIDIA', 'AMD', 'Intel', 'None')
        })
      }),
      operatingSystem: Joi.object({
        type: Joi.string().valid('Windows', 'Linux', 'macOS'),
        version: Joi.string().allow(''),
        template: Joi.string().allow('')
      }),
      targetAudience: Joi.string().valid('developer', 'designer', 'analyst', 'general', 'power-user'),
      isTemplate: Joi.boolean(),
      isActive: Joi.boolean(),
      tags: Joi.array().items(Joi.string().trim())
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { id } = req.params;
    const profile = await VDIProfile.findById(id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (req.user.organization.type !== 'admin' && 
        profile.organization.toString() !== req.user.organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (value.name && value.name !== profile.name) {
      const existingProfile = await VDIProfile.findOne({
        name: value.name,
        organization: req.user.organization._id,
        _id: { $ne: id }
      });

      if (existingProfile) {
        return res.status(409).json({ error: 'Profile with this name already exists' });
      }
    }

    const updatedProfile = await VDIProfile.findByIdAndUpdate(
      id,
      { 
        $set: value,
        $inc: { version: 1 }
      },
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'username email')
    .populate('organization', 'name type');

    logger.info(`Profile "${updatedProfile.name}" updated by ${req.user.username}`);

    res.json(updatedProfile);
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await VDIProfile.findById(id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (req.user.organization.type !== 'admin' && 
        profile.organization.toString() !== req.user.organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const activeInstances = await VDI.countDocuments({
      profile: id,
      status: 'active'
    });

    if (activeInstances > 0) {
      return res.status(400).json({ 
        error: `Cannot delete profile with ${activeInstances} active VDI instances` 
      });
    }

    await VDIProfile.findByIdAndDelete(id);

    await VDI.updateMany(
      { profile: id },
      { $unset: { profile: 1 } }
    );

    logger.info(`Profile "${profile.name}" deleted by ${req.user.username}`);

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    logger.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const cloneProfile = async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required().trim().min(1).max(100),
      description: Joi.string().allow('').trim().max(500)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { id } = req.params;
    const sourceProfile = await VDIProfile.findById(id);

    if (!sourceProfile) {
      return res.status(404).json({ error: 'Source profile not found' });
    }

    if (req.user.organization.type !== 'admin' && 
        sourceProfile.organization.toString() !== req.user.organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const existingProfile = await VDIProfile.findOne({
      name: value.name,
      organization: req.user.organization._id
    });

    if (existingProfile) {
      return res.status(409).json({ error: 'Profile with this name already exists' });
    }

    const clonedProfile = new VDIProfile({
      name: value.name,
      description: value.description || `Clone of ${sourceProfile.name}`,
      organization: req.user.organization._id,
      resourceSpecs: sourceProfile.resourceSpecs,
      operatingSystem: sourceProfile.operatingSystem,
      targetAudience: sourceProfile.targetAudience,
      isTemplate: false,
      tags: [...sourceProfile.tags],
      createdBy: req.user._id
    });

    await clonedProfile.save();

    const populatedProfile = await VDIProfile.findById(clonedProfile._id)
      .populate('createdBy', 'username email')
      .populate('organization', 'name type');

    logger.info(`Profile "${clonedProfile.name}" cloned from "${sourceProfile.name}" by ${req.user.username}`);

    res.status(201).json(populatedProfile);
  } catch (error) {
    logger.error('Error cloning profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProfileTemplates = async (req, res) => {
  try {
    const templates = await VDIProfile.find({
      isTemplate: true,
      isActive: true
    })
    .select('name description resourceSpecs operatingSystem targetAudience tags')
    .sort({ name: 1 })
    .lean();

    res.json(templates);
  } catch (error) {
    logger.error('Error fetching profile templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProfileAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await VDIProfile.findById(id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (req.user.organization.type !== 'admin' && 
        profile.organization.toString() !== req.user.organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [vdis, utilizationData] = await Promise.all([
      VDI.find({ profile: id }).lean(),
      VDI.aggregate([
        { $match: { profile: profile._id } },
        { $lookup: {
          from: 'utilizationmetrics',
          localField: '_id',
          foreignField: 'vdiId',
          as: 'metrics'
        }},
        { $unwind: { path: '$metrics', preserveNullAndEmptyArrays: true } },
        { $match: { 'metrics.timestamp': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: {
          _id: '$_id',
          ciName: { $first: '$ciName' },
          avgCpuUsage: { $avg: '$metrics.metrics.cpu.usage' },
          avgMemoryUsage: { $avg: '$metrics.metrics.memory.usage' },
          avgStorageUsage: { $avg: '$metrics.metrics.storage.usage' }
        }}
      ])
    ]);

    const analytics = {
      totalInstances: vdis.length,
      activeInstances: vdis.filter(v => v.status === 'active').length,
      utilizationAnalysis: {
        averageUsage: {
          cpu: utilizationData.reduce((sum, d) => sum + (d.avgCpuUsage || 0), 0) / utilizationData.length || 0,
          memory: utilizationData.reduce((sum, d) => sum + (d.avgMemoryUsage || 0), 0) / utilizationData.length || 0,
          storage: utilizationData.reduce((sum, d) => sum + (d.avgStorageUsage || 0), 0) / utilizationData.length || 0
        },
        underutilized: utilizationData.filter(d => (d.avgCpuUsage || 0) < 20).length,
        overutilized: utilizationData.filter(d => (d.avgCpuUsage || 0) > 80).length
      },
      resourceEfficiency: {
        totalAllocatedCPU: vdis.reduce((sum, v) => sum + (v.resourceAllocation.cpu.cores || 0), 0),
        totalAllocatedMemory: vdis.reduce((sum, v) => sum + (v.resourceAllocation.memory.allocated || 0), 0),
        totalAllocatedStorage: vdis.reduce((sum, v) => sum + (v.resourceAllocation.storage.allocated || 0), 0)
      },
      recommendations: generateProfileRecommendations(profile, utilizationData)
    };

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching profile analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function generateProfileRecommendations(profile, utilizationData) {
  const recommendations = [];
  
  if (utilizationData.length === 0) {
    return recommendations;
  }

  const avgCpuUsage = utilizationData.reduce((sum, d) => sum + (d.avgCpuUsage || 0), 0) / utilizationData.length;
  const avgMemoryUsage = utilizationData.reduce((sum, d) => sum + (d.avgMemoryUsage || 0), 0) / utilizationData.length;
  const underutilizedCount = utilizationData.filter(d => (d.avgCpuUsage || 0) < 20).length;
  const overutilizedCount = utilizationData.filter(d => (d.avgCpuUsage || 0) > 80).length;

  if (avgCpuUsage < 30 && underutilizedCount > utilizationData.length * 0.6) {
    recommendations.push({
      type: 'downsize',
      priority: 'high',
      message: `Consider reducing CPU allocation. Average usage is ${avgCpuUsage.toFixed(1)}% with ${underutilizedCount} underutilized instances.`,
      suggestedChange: {
        cpu: Math.max(1, Math.floor(profile.resourceSpecs.cpu.cores * 0.75))
      }
    });
  }

  if (avgCpuUsage > 80 && overutilizedCount > utilizationData.length * 0.3) {
    recommendations.push({
      type: 'upsize',
      priority: 'high',
      message: `Consider increasing CPU allocation. Average usage is ${avgCpuUsage.toFixed(1)}% with ${overutilizedCount} overutilized instances.`,
      suggestedChange: {
        cpu: Math.min(32, Math.ceil(profile.resourceSpecs.cpu.cores * 1.25))
      }
    });
  }

  if (avgMemoryUsage < 40) {
    recommendations.push({
      type: 'downsize',
      priority: 'medium',
      message: `Memory allocation might be excessive. Average usage is ${avgMemoryUsage.toFixed(1)}%.`,
      suggestedChange: {
        memory: Math.max(1024, Math.floor(profile.resourceSpecs.memory.allocated * 0.8))
      }
    });
  }

  return recommendations;
}

module.exports = {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  cloneProfile,
  getProfileTemplates,
  getProfileAnalytics
};