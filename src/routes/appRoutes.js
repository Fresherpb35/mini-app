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
} = require('../controllers/appController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', getApps);
router.get('/top', getTopRatedApps);
router.get('/new', getNewReleases);
router.get('/category/:category', getAppsByCategory);
router.get('/search', searchApps);
router.get('/:id', getApp);
router.get('/:id/reviews', getAppReviews);

// Protected routes
router.use(protect);

router.post('/:id/reviews', createAppReview);
router.get('/:id/download', downloadApp);

module.exports = router;
