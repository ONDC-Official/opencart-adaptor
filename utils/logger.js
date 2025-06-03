import winston from "winston";
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;


// Custom format for detailed logging
const detailedFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let metaStr = '';

  if (Object.keys(metadata).length > 0) {
    metaStr = JSON.stringify(metadata);
  }

  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Create different logger configurations for different environments
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'ondc-opencart' },
  transports: [
    new transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        detailedFormat
      )
    }),
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5 
    }),
    new transports.File({ 
      filename: 'logs/app.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5 
    })
  ]
});

logger.requestContext = (req) => {
  if (req?.body?.context?.transaction_id) {
    return {
      transactionId: req.body.context.transaction_id,
      messageId: req.body.context.message_id,
      action: req.body.context.action
    };
  }
  return {};
};

logger.logConfirmValidationError = (req, error) => {
  const requestContext = logger.requestContext(req);
  logger.error(`Validation failed during confirm API: ${error.message}`, {
    ...requestContext,
    error: error.stack
  });
};

logger.logSuccessfulSignatureVerification = (req, subscriber_id) => {
  const requestContext = logger.requestContext(req);
  logger.info(`Signature verification succeeded for subscriber ${subscriber_id}`, {
    ...requestContext
  });
};

logger.logFailedSignatureVerification = (req, error) => {
  const requestContext = logger.requestContext(req);
  logger.error(`Signature verification failed`, {
    ...requestContext,
    error: error.message
  });
};

logger.logPublicKeyLookupFailure = (req, subscriber_id, error) => {
  const requestContext = logger.requestContext(req);
  logger.error(`Public key lookup failed for subscriber ${subscriber_id}`, {
    ...requestContext,
    error: error.message
  });
};

logger.logMissingHeader = (req, headerName) => {
  const requestContext = logger.requestContext(req);
  logger.error(`Missing or invalid ${headerName} header in request`, {
    ...requestContext
  });
};

logger.logTimestampValidationError = (req, error) => {
  const requestContext = logger.requestContext(req);
  logger.error(`Timestamp validation failed during signature verification`, {
    ...requestContext,
    error: error.message
  });
};

export default logger;
