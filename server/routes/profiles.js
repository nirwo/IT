const express = require('express');
const router = express.Router();
const { authenticate, authorize, restrictToOrganization } = require('../middleware/auth');
const {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  cloneProfile,
  getProfileTemplates,
  getProfileAnalytics
} = require('../controllers/profileController');

router.get('/', authenticate, restrictToOrganization, getProfiles);
router.get('/templates', authenticate, getProfileTemplates);
router.get('/:id', authenticate, restrictToOrganization, getProfile);
router.get('/:id/analytics', authenticate, restrictToOrganization, getProfileAnalytics);
router.post('/', authenticate, authorize(['profile_management', 'admin']), restrictToOrganization, createProfile);
router.put('/:id', authenticate, authorize(['profile_management', 'admin']), restrictToOrganization, updateProfile);
router.delete('/:id', authenticate, authorize(['profile_management', 'admin']), restrictToOrganization, deleteProfile);
router.post('/:id/clone', authenticate, authorize(['profile_management', 'admin']), restrictToOrganization, cloneProfile);

module.exports = router;