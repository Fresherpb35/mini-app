const { supabase } = require('../config/db');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return next(new ErrorResponse('Please provide name, email, and password', 400));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new ErrorResponse('Please provide a valid email', 400));
    }

    // Validate password length
    if (password.length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters', 400));
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role
        },
        emailRedirectTo: 'http://localhost:3000/auth/confirm'
      }
    });

    if (error) {
      console.error('Supabase Auth signup error:', error);
      return next(new ErrorResponse(`Registration failed: ${error.message}`, 400));
    }

    // User data is stored in Supabase Auth user metadata
    // No separate users table needed

    res.status(201).json({
      success: true,
      message: data.user?.email_confirmed_at 
        ? 'Registration successful' 
        : 'Registration successful. Please check your email to verify your account.',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name,
        role,
        email_confirmed: !!data.user?.email_confirmed_at
      },
      session: data.session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return next(new ErrorResponse('Please provide email and password', 400));
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Supabase Auth login error:', error);
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        role: data.user.user_metadata?.role || 'user',
        email_confirmed: !!data.user.email_confirmed_at
      },
      session: data.session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ErrorResponse('No token provided', 401));
    }

    const token = authHeader.substring(7);
    
    // Get user from Supabase Auth using the token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new ErrorResponse('Invalid token', 401));
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        role: user.user_metadata?.role || 'user',
        email_confirmed: !!user.email_confirmed_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ErrorResponse('No token provided', 401));
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return next(new ErrorResponse('Invalid token', 401));
    }

    const { name, email } = req.body;
    
    // Update user metadata in Supabase Auth
    const { error: updateAuthError } = await supabase.auth.updateUser({
      email: email || user.email,
      data: {
        name: name || user.user_metadata?.name
      }
    });

    if (updateAuthError) {
      return next(new ErrorResponse(`Error updating auth user: ${updateAuthError.message}`, 500));
    }

    res.status(200).json({
      success: true,
      message: 'User details updated successfully',
      user: {
        id: user.id,
        email: email || user.email,
        name: name || user.user_metadata?.name,
        role: user.user_metadata?.role || 'user'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ErrorResponse('No token provided', 401));
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return next(new ErrorResponse('Invalid token', 401));
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      return next(new ErrorResponse('Please provide new password', 400));
    }

    if (newPassword.length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters', 400));
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return next(new ErrorResponse(`Error updating password: ${updateError.message}`, 500));
    }

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorResponse('Please provide email address', 400));
    }

    // Send password reset email using Supabase Auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/auth/reset-password'
    });

    if (error) {
      console.error('Password reset error:', error);
      return next(new ErrorResponse('Error sending password reset email', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { access_token, refresh_token, new_password } = req.body;

    if (!access_token || !refresh_token || !new_password) {
      return next(new ErrorResponse('Missing required fields', 400));
    }

    if (new_password.length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters', 400));
    }

    // Set the session using the tokens from the reset email
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (sessionError) {
      return next(new ErrorResponse('Invalid or expired reset tokens', 400));
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password
    });

    if (updateError) {
      return next(new ErrorResponse(`Error updating password: ${updateError.message}`, 500));
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      session: sessionData.session
    });
  } catch (error) {
    next(error);
  }
};



// @desc    Google OAuth login
// @route   GET|POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res, next) => {
  try {
    // Get redirect URL from request body/query or use default
    const { redirectTo } = req.body || req.query;
    const defaultRedirect = 'http://localhost:3000/auth/callback'; 
    // Initiate Google OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || defaultRedirect
      }
    });

    if (error) {
      console.error('Google OAuth error:', error);
      return next(new ErrorResponse(`Google login failed: ${error.message}`, 500));
    }

    // Return the OAuth URL for frontend to redirect to
    res.status(200).json({
      success: true,
      message: 'Google OAuth initiated',
      url: data.url
    });
  } catch (error) {
    console.error('Google login error:', error);
    next(error);
  }
};


// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ErrorResponse('No token provided', 401));
    }

    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return next(new ErrorResponse('Error during logout', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Phone number registration
// @route   POST /api/auth/register-phone
// @access  Public
exports.registerWithPhone = async (req, res, next) => {
  try {
    const { phone, password, name, role = 'user' } = req.body;

    // Validate required fields
    if (!phone || !password || !name) {
      return next(new ErrorResponse('Please provide phone, password, and name', 400));
    }

    // Validate password length
    if (password.length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters', 400));
    }

    // Create user with Supabase Auth using phone
    const { data, error } = await supabase.auth.signUp({
      phone,
      password,
      options: {
        data: {
          name,
          role
        }
      }
    });

    if (error) {
      console.error('Supabase Auth phone signup error:', error);
      return next(new ErrorResponse(`Registration failed: ${error.message}`, 400));
    }

    res.status(201).json({
      success: true,
      message: data.user?.phone_confirmed_at 
        ? 'Registration successful' 
        : 'Registration successful. Please verify your phone number.',
      user: {
        id: data.user?.id,
        phone: data.user?.phone,
        name,
        role,
        phone_confirmed: !!data.user?.phone_confirmed_at
      },
      session: data.session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Phone number login
// @route   POST /api/auth/login-phone
// @access  Public
exports.loginWithPhone = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // Validate required fields
    if (!phone || !password) {
      return next(new ErrorResponse('Please provide phone and password', 400));
    }

    // Sign in with Supabase Auth using phone
    const { data, error } = await supabase.auth.signInWithPassword({
      phone,
      password
    });

    if (error) {
      console.error('Supabase Auth phone login error:', error);
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: data.user.id,
        phone: data.user.phone,
        name: data.user.user_metadata?.name,
        role: data.user.user_metadata?.role || 'user',
        phone_confirmed: !!data.user.phone_confirmed_at
      },
      session: data.session
    });
  } catch (error) {
    next(error);
  }
};
