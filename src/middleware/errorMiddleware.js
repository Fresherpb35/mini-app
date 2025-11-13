// Error handler to standardize error responses
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for development
  console.error(err.stack);

  // Handle specific error types
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new Error(message, 404);
  }

  // Handle duplicate field value
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new Error(message, 400);
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new Error(message, 400);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Not authorized, token failed';
    error = new Error(message, 401);
  }

  // Handle JWT expired
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired, please login again';
    error = new Error(message, 401);
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

// Custom error class
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

module.exports = { errorHandler, ErrorResponse };
