const express = require('express');
const router = express.Router();
const {
  // User Management
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  
  // App Management
  getPendingApps,
  updateAppStatus,
  getAllApps,
  updateApp,
  
  // Featured Apps
  featureApp,
  getFeaturedApps,
  updateFeaturedApp,
  removeFeaturedApp,
  
  // Platform Analytics
  getPlatformAnalytics,
  getRecentActivities,
  
  // Categories & Tags
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // System Settings
  updateSettings,
  
  // Reports
  generateReport,
  
  // Backup & Restore
  createBackup,
  restoreBackup,
  listBackups,
  
  // Review Monitoring
  getFlaggedReviews,
  deleteReview
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');
const { getNotifications } = require('../controllers/notificationController');
const upload = require('../middleware/upload');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// Protect all routes and ensure user is admin
router.use(protect);
router.use(authorize('admin'));

// User Management
router.route('/users')
  .get(getUsers)
  .post(createUser);

router.route('/users/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.put('/users/:id/status', updateUserStatus);

// App Management
router.get('/apps/pending', getPendingApps);
router.get('/apps', getAllApps);
router.put('/apps/:id/status', updateAppStatus);
router.put('/apps/:id', 
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
  updateApp
);

// Featured Apps Management
router.route('/featured-apps')
  .get(getFeaturedApps)
  .post(featureApp);

router.route('/featured-apps/:id')
  .put(updateFeaturedApp)
  .delete(removeFeaturedApp);

// Platform Analytics
router.get('/analytics', getPlatformAnalytics);
router.get('/activities', getRecentActivities);

// Categories & Tags
router.route('/categories')
  .get(getCategories)
  .post(createCategory);

router.route('/categories/:id')
  .put(updateCategory)
  .delete(deleteCategory);

// System Settings
router.put('/settings', updateSettings);

// Reports
router.post('/reports', generateReport);

// Notifications
router.get('/notifications', getNotifications)

// Backup & Restore
router.post('/backup', createBackup);
router.post('/restore', restoreBackup);
router.get('/backups', listBackups)

// Review Monitoring
router.get('/reviews/flagged', getFlaggedReviews);
router.delete('/reviews/:id', deleteReview);

module.exports = router;
