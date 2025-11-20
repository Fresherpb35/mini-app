const express = require('express');
const router = express.Router();
const {
  getApps,
  getApp,
  downloadApp,
  createAppReview,
  getAppReviews,
  getTopRatedApps,
  getNewReleases,
  getAppsByCategory,
  searchApps,
  updateMultipleApps,
  getFeaturedApps,
  getCategories,
} = require('../controllers/appController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getApps);
router.get('/top', getTopRatedApps);
router.get('/new', getNewReleases);
router.get('/featured', getFeaturedApps);
router.get('/categories', getCategories);
router.get('/category/:category', getAppsByCategory);
router.get('/search', searchApps);
router.get('/:id', getApp);
router.get('/:id/reviews', getAppReviews);

// Protected routes
router.use(protect);

// Regular user routes
router.post('/:id/reviews', createAppReview);
router.get('/:id/download', downloadApp);

// Admin routes
router.use(authorize('admin'));
router.put('/update-multiple', updateMultipleApps);

module.exports = router;
