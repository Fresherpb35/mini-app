const express = require('express');
const router = express.Router();
const {
  sendPushNotification,
  getNotificationStats,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Admin routes - require admin role
router.use(authorize('admin'));
router.post('/push', sendPushNotification);
router.get('/stats', getNotificationStats);

module.exports = router;
