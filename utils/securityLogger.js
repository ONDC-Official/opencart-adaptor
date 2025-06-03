import winston from 'winston';
import { createLogger, format, transports } from winston;
const { combine, timestamp, json } = format;

// Create a separate logger for security events
const securityLogger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'ondc-security' },
  transports: [
    // Console transport for development
    new transports.Console({
      format: combine(
        format.colorize(),
        timestamp(),
        format.printf(({ level, message, timestamp, ...metadata }) => {
          return `${timestamp} [${level}]: ${message} ${JSON.stringify(metadata)}`;
        })
      )
    }),
    // File transport for security events
    new transports.File({ 
      filename: 'logs/security.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Security event types
const SecurityEventType = {
  AUTH_ATTEMPT: 'AUTH_ATTEMPT',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  RATE_LIMIT: 'RATE_LIMIT',
  SIGNATURE_VERIFICATION: 'SIGNATURE_VERIFICATION',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY'
};

// Enhanced security logging functions
const securityLog = {
  logAuthAttempt: (req, subscriberId) => {
    securityLogger.info('Authentication attempt', {
      event: SecurityEventType.AUTH_ATTEMPT,
      ip: req.ip,
      subscriberId,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  },

  logAuthSuccess: (req, subscriberId) => {
    securityLogger.info('Authentication successful', {
      event: SecurityEventType.AUTH_SUCCESS,
      ip: req.ip,
      subscriberId,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  },

  logAuthFailure: (req, error, subscriberId) => {
    securityLogger.warn('Authentication failed', {
      event: SecurityEventType.AUTH_FAILURE,
      ip: req.ip,
      subscriberId,
      path: req.path,
      method: req.method,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  },

  logRateLimit: (req, limit, windowMs) => {
    securityLogger.warn('Rate limit exceeded', {
      event: SecurityEventType.RATE_LIMIT,
      ip: req.ip,
      path: req.path,
      method: req.method,
      limit,
      windowMs,
      timestamp: new Date().toISOString()
    });
  },

  logSignatureVerification: (req, success, error = null) => {
    const level = success ? 'info' : 'warn';
    securityLogger[level]('Signature verification', {
      event: SecurityEventType.SIGNATURE_VERIFICATION,
      ip: req.ip,
      path: req.path,
      method: req.method,
      success,
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  },

  logInvalidRequest: (req, error) => {
    securityLogger.warn('Invalid request detected', {
      event: SecurityEventType.INVALID_REQUEST,
      ip: req.ip,
      path: req.path,
      method: req.method,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  },

  logSuspiciousActivity: (req, details) => {
    securityLogger.error('Suspicious activity detected', {
      event: SecurityEventType.SUSPICIOUS_ACTIVITY,
      ip: req.ip,
      path: req.path,
      method: req.method,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

export default securityLog; 