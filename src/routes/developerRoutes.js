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
const { sendAppNotification } = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// Protect all routes
router.use(protect);
router.use(authorize('developer', 'admin'));

// App management routes
router.get('/apps', getDeveloperApps);
router.get('/dashboard', getDeveloperDashboard);

// File uploads
router.post('/apps/upload', 
  (req, res, next) => {
    upload.fields([
      { name: 'apk', maxCount: 1 },
      { name: 'app_icon', maxCount: 1 },
      { name: 'screenshots', maxCount: 5 }
    ])(req, res, (err) => {
      if (err) {
        return next(new ErrorResponse(err.message, 400));
      }
      next();
    });
  },
  uploadApp
);

// Separate routes for individual updates
router.put('/apps/:id/icon', 
  upload.single('icon'), 
  (req, res, next) => {
    if (!req.file) {
      return next(new ErrorResponse('Please upload an icon file', 400));
    }
    next();
  },
  uploadAppIcon
);

router.put('/apps/:id/screenshots', 
  upload.array('screenshots', 5), 
  (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next(new ErrorResponse('Please upload at least one screenshot', 400));
    }
    next();
  },
  uploadAppScreenshots
);

// App management
router
  .route('/apps/:id')
  .put(updateApp)
  .delete(deleteApp);

// Analytics
router.get('/analytics/:appId', getAppAnalytics);

// Notifications
router.post('/apps/:appId/notifications', sendAppNotification);

module.exports = router;
