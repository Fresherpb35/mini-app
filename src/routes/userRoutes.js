const express = require('express');
const router = express.Router();
const {
  getUserDownloads,
  checkAppUpdates,
  updateApp,
  uninstallApp,
  getUserProfile,
} = require('../controllers/userController');
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// User profile and statistics
router.get('/profile', getUserProfile);

// App management routes
router.get('/downloads', getUserDownloads);
router.get('/updates', checkAppUpdates);
router.post('/update/:appId', updateApp);
router.delete('/uninstall/:appId', uninstallApp);

// Notification routes
router.get('/notifications', getUserNotifications);
router.put('/notifications/:id/read', markNotificationAsRead);
router.put('/notifications/read-all', markAllNotificationsAsRead);

module.exports = router;
