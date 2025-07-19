const express = require('express');
const router = express.Router();
const { authenticate, authorize, restrictToOrganization } = require('../middleware/auth');
const {
  getClusters,
  getCluster,
  getAllocationProfiles,
  getAllocationProfile,
  createAllocationProfile,
  updateAllocationProfile,
  getCapacityStatus,
  recalculateCapacity,
  generateAutoProfiles,
  getCapacityRecommendations
} = require('../controllers/capacityController');

// Cluster routes
router.get('/clusters', authenticate, restrictToOrganization, getClusters);
router.get('/clusters/:id', authenticate, restrictToOrganization, getCluster);
router.post('/clusters/:clusterId/recalculate', authenticate, authorize(['admin']), restrictToOrganization, recalculateCapacity);
router.post('/clusters/:clusterId/auto-profiles', authenticate, authorize(['admin']), restrictToOrganization, generateAutoProfiles);
router.get('/clusters/:clusterId/recommendations', authenticate, restrictToOrganization, getCapacityRecommendations);

// Allocation profile routes
router.get('/profiles', authenticate, restrictToOrganization, getAllocationProfiles);
router.get('/profiles/:id', authenticate, restrictToOrganization, getAllocationProfile);
router.post('/profiles', authenticate, authorize(['admin', 'profile_management']), restrictToOrganization, createAllocationProfile);
router.put('/profiles/:id', authenticate, authorize(['admin', 'profile_management']), restrictToOrganization, updateAllocationProfile);

// General capacity routes
router.get('/status', authenticate, restrictToOrganization, getCapacityStatus);

module.exports = router;