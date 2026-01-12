const { supabase } = require('../config/db');
const { ErrorResponse } = require('./errorMiddleware');

// Protect routes - User must be authenticated
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    // Fetch role from public.users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return next(new ErrorResponse('User profile not found', 403));
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: profile.name || user.email?.split('@')[0],
      avatar_url: profile.avatar_url || null,
      role: profile.role || 'user',
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
