const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  getDeveloperApps,
  uploadApp,
  updateApp,
  deleteApp,
  uploadAppIcon,
  uploadAppScreenshots,
  getAppAnalytics,
  getDeveloperDashboard,
} = require('../controllers/developerController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Protect all routes
router.use(protect);
router.use(authorize('developer', 'admin'));

// App management routes
router.get('/apps', getDeveloperApps);
router.get('/dashboard', getDeveloperDashboard);

// File uploads
router.post('/apps/upload', upload.single('apk'), uploadApp);
router.put('/apps/:id/icon', upload.single('icon'), uploadAppIcon);
router.put('/apps/:id/screenshots', upload.array('screenshots', 5), uploadAppScreenshots);

// App management
router
  .route('/apps/:id')
  .put(updateApp)
  .delete(deleteApp);

// Analytics
router.get('/analytics/:appId', getAppAnalytics);

module.exports = router;
