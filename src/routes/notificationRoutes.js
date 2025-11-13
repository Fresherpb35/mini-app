const express = require('express');
const router = express.Router();
const {
  sendPushNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationStats,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

// User notification routes
router.use(protect);

// User routes
router.get('/user', getUserNotifications);
router.put('/user/:id/read', markNotificationAsRead);
router.put('/user/read-all', markAllNotificationsAsRead);

// Admin routes
router.use(authorize('admin'));
router.post('/push', sendPushNotification);
router.get('/stats', getNotificationStats);

module.exports = router;
