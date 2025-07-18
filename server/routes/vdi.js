const express = require('express');
const router = express.Router();
const { authenticate, authorize, restrictToOrganization } = require('../middleware/auth');
const {
  getVDIs,
  getVDI,
  getVDIMetrics,
  getVDIActivity,
  getUtilizationSummary,
  updateVDI
} = require('../controllers/vdiController');

router.get('/', authenticate, restrictToOrganization, getVDIs);
router.get('/summary', authenticate, restrictToOrganization, getUtilizationSummary);
router.get('/:id', authenticate, restrictToOrganization, getVDI);
router.get('/:id/metrics', authenticate, restrictToOrganization, getVDIMetrics);
router.get('/:id/activity', authenticate, restrictToOrganization, getVDIActivity);
router.put('/:id', authenticate, authorize(['write', 'admin']), restrictToOrganization, updateVDI);

module.exports = router;