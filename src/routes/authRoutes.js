const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const upload = require('../middleware/upload');
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updateDetails,
  updatePassword,
  logout,
  googleLogin,
  registerWithPhone,
  loginWithPhone,
  uploadAvatar,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  register
);

router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  login
);

router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword', resetPassword);

// Google OAuth routes
router.post('/google', googleLogin);
router.get('/google', googleLogin); // Also allow GET for easier testing

// Phone authentication routes
router.post('/register-phone', registerWithPhone);
router.post('/login-phone', loginWithPhone);

// Protected routes
router.use(protect);

router.get('/me', getMe);
router.put(
  '/updatedetails',
  [
    check('name', 'Name must be at least 2 characters').optional().isLength({ min: 2 }),
    check('email', 'Please include a valid email').optional().isEmail(),
    check('phone', 'Please include a valid phone number').optional().isMobilePhone(),
    check('bio', 'Bio must be less than 500 characters').optional().isLength({ max: 500 }),
    check('avatar_url', 'Please include a valid URL').optional().isURL()
  ],
  updateDetails
);
router.put('/avatar/upload', upload.uploadAvatar('avatar'), uploadAvatar);
router.put('/updatepassword', updatePassword);
router.get('/logout', logout);

module.exports = router;
