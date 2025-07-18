const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const logger = require('../config/logger');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .populate('organization')
      .select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    req.organization = user.organization;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (permissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasPermission = permissions.some(permission => 
      req.user.permissions.includes(permission) || 
      req.user.role === 'admin'
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const restrictToOrganization = async (req, res, next) => {
  try {
    if (req.user.organization.type === 'admin') {
      return next();
    }

    const organizationId = req.params.organizationId || req.query.organizationId;
    
    if (organizationId && organizationId !== req.user.organization._id.toString()) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    next();
  } catch (error) {
    logger.error('Organization restriction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  authenticate,
  authorize,
  restrictToOrganization
};