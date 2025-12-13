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
const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkWishlist,
  updateReview,
  deleteReview,
  getUserReviews,
  markReviewHelpful,
  reportReview,
} = require('../controllers/wishlistReviewController');
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

// Wishlist routes
router.get('/wishlist', getWishlist);
router.post('/wishlist/:appId', addToWishlist);
router.delete('/wishlist/:appId', removeFromWishlist);
router.get('/wishlist/check/:appId', checkWishlist);

// Review management routes
router.get('/reviews', getUserReviews);
router.put('/reviews/:reviewId', updateReview);
router.delete('/reviews/:reviewId', deleteReview);
router.post('/reviews/:reviewId/helpful', markReviewHelpful);
router.post('/reviews/:reviewId/report', reportReview);

// Notification routes
router.get('/notifications', getUserNotifications);
router.put('/notifications/:id/read', markNotificationAsRead);
router.put('/notifications/read-all', markAllNotificationsAsRead);

module.exports = router;
