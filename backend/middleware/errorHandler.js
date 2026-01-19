/* eslint-disable no-unused-vars */
module.exports = (err, req, res, next) => {
  // If the response has already started, delegate to default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Clone and normalize
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const dupField = Object.keys(err.keyPattern || {})[0];
    message = dupField ? `Duplicate value for field "${dupField}"` : 'Duplicate field value entered';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((val) => val.message)
      .join(', ') || 'Validation error';
  }

  // Log full error on server
  // Prefer err.stack if available for debugging
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error handler caught:', err.stack || err);
  }

  // Send JSON response
  return res.status(statusCode).json({
    success: false,
    message
  });
};
