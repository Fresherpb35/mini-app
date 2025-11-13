const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
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
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePassword);
router.get('/logout', logout);

module.exports = router;
