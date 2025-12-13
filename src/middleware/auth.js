const { supabase } = require('../config/db');
const { ErrorResponse } = require('./errorMiddleware');

// Protect routes - User must be authenticated
exports.protect = async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    // Add user to request object with Supabase Auth data
    // Extract user data from user_metadata or raw_user_meta_data (for OAuth users)
    req.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || 
            user.user_metadata?.full_name || 
            user.raw_user_meta_data?.name ||
            user.raw_user_meta_data?.full_name ||
            user.email?.split('@')[0] ||
            'User',
      avatar_url: user.user_metadata?.avatar_url || 
                  user.raw_user_meta_data?.avatar_url || 
                  null,
      role: user.user_metadata?.role || 
            user.app_metadata?.role || 
            'user',
      email_confirmed: !!user.email_confirmed_at
    };
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Check if user is the owner of the resource or admin
exports.checkOwnership = (model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resource = await model.findByPk(req.params[paramName]);

      if (!resource) {
        return next(new ErrorResponse('Resource not found', 404));
      }

      // Check if user is admin or the owner of the resource
      if (req.user.role !== 'admin' && resource.userId.toString() !== req.user.id) {
        return next(
          new ErrorResponse('Not authorized to update this resource', 401)
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
