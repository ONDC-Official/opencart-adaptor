const logger = require('./logger');
class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Middleware for handling errors in Express
 */
const errorHandler = (err, req, res, next) => {
  // Get transaction ID from request if available
  const transactionId = req.body?.context?.transaction_id || 'unknown';
  
  // Determine error status code
  const statusCode = err.status || 500;
  
  // Log the error with details
  logger.error(`API Error: ${err.message}`, {
    transactionId,
    stack: err.stack,
    status: statusCode,
    path: req.path,
    method: req.method
  });
  
  // Format error response based on ONDC requirements
  if (req.path.includes('/api/v1/') && req.body?.context) {
    // For ONDC APIs, format error according to ONDC error response structure
    const errorResponse = {
      context: {
        ...req.body.context,
        action: `on_${req.body.context.action}`,
        timestamp: new Date().toISOString()
      },
      error: {
        code: String(statusCode),
        message: err.message,
        type: statusCode >= 500 ? 'INTERNAL-ERROR' : 'BAD-REQUEST'
      }
    };
    
    return res.status(statusCode).json(errorResponse);
  }
  
  // For non-ONDC APIs, use standard error format
  res.status(statusCode).json({
    error: {
      message: err.message,
      status: statusCode
    }
  });
};

// Helper function for controllers to use
const handleError = (res, error, customMessage) => {
  logger.error(`${customMessage}: ${error.message}`, { stack: error.stack });
  
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message });
  } else {
    res.status(500).json({ error: customMessage || 'Internal server error' });
  }
};

module.exports = {
  ApiError,
  errorHandler,
  handleError
};