const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'simple-microservice' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    }),

    // Separate files for specific operations
    new winston.transports.File({
      filename: path.join(logsDir, 'auth.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Helper functions for specific log types
const logAuth = (action, username, success = true, details = {}) => {
  logger.info(`AUTH: ${action}`, {
    username,
    success,
    timestamp: new Date().toISOString(),
    ...details
  });
};

const logMovieUpdate = (action, movieId, username, details = {}) => {
  logger.info(`MOVIE: ${action}`, {
    movieId,
    username,
    timestamp: new Date().toISOString(),
    ...details
  });
};

const logAdminAction = (action, adminUser, targetUser = null, details = {}) => {
  logger.info(`ADMIN: ${action}`, {
    adminUser,
    targetUser,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Export logger as default, helpers as named exports
module.exports = {
  logger,         // Winston logger instance
  logAuth,
  logMovieUpdate,
  logAdminAction
};

