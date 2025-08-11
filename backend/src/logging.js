// Import required dependencies for logging functionality
const winston = require('winston');  // Winston: multi-transport async logging library for Node.js
const fs = require('fs');           // File system module for directory operations
const path = require('path');       // Path module for cross-platform file path handling

// ========== LOGS DIRECTORY SETUP ==========
// Create logs directory if it doesn't exist to prevent runtime errors
const logsDir = path.join(__dirname, '../logs');  // Path to logs directory
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true }); // Create directory and any missing parent directories
}

// ========== WINSTON LOGGER CONFIGURATION ==========
// Main logger instance with comprehensive configuration
const logger = winston.createLogger({
  level: 'info',        // Minimum log level (captures error, warn, info)
  
  // Log format configuration
  format: winston.format.combine(
    winston.format.timestamp(),           // Add timestamp to each log entry
    winston.format.errors({ stack: true }), // Include stack traces for errors
    winston.format.json()                 // Format as JSON for parsing
  ),
  
  // Default metadata added to every log entry for service identification
  defaultMeta: { service: 'movie-list-ms' },
  
  // ========== TRANSPORT CONFIGURATION ==========
  transports: [
    // Error-only log file for quick troubleshooting
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),

    // Combined log file for all activity
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    }),

    // Authentication-specific log with custom readable format
    new winston.transports.File({
      filename: path.join(logsDir, 'auth.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          // Custom format: "TIMESTAMP [LEVEL] MESSAGE METADATA"
          return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

// ========== DEVELOPMENT CONSOLE LOGGING ==========
// Add console output for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()  // Simple format for development readability
  }));
}

// ========== HELPER FUNCTIONS ==========
// Standardized logging functions for common application events

/**
 * Log authentication events
 * @param {string} action - Authentication action (LOGIN, LOGOUT, REGISTER, etc.)
 * @param {string} username - Username involved
 * @param {boolean} success - Success status (default: true)
 * @param {object} details - Additional details
 */
const logAuth = (action, username, success = true, details = {}) => {
  logger.info(`AUTH: ${action}`, {
    username,
    success,
    timestamp: new Date().toISOString(),
    ...details
  });
};

/**
 * Log movie operations
 * @param {string} action - Movie action (CREATE, UPDATE, DELETE)
 * @param {string|number} movieId - Movie ID
 * @param {string} username - User performing action
 * @param {object} details - Operation details
 */
const logMovieUpdate = (action, movieId, username, details = {}) => {
  logger.info(`MOVIE: ${action}`, {
    movieId,
    username,
    timestamp: new Date().toISOString(),
    ...details
  });
};

/**
 * Log administrative actions
 * @param {string} action - Admin action
 * @param {string} adminUser - Administrator username
 * @param {string|null} targetUser - Affected user (optional)
 * @param {object} details - Action details
 */
const logAdminAction = (action, adminUser, targetUser = null, details = {}) => {
  logger.info(`ADMIN: ${action}`, {
    adminUser,
    targetUser,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// ========== MODULE EXPORTS ==========
// Export the logger instance and helper functions for use throughout the application
// This modular approach allows for consistent logging across all application components
module.exports = {
  logger,         // Main Winston logger instance for custom logging needs
  logAuth,        // Helper for authentication event logging
  logMovieUpdate, // Helper for movie operation logging
  logAdminAction  // Helper for administrative action logging
};
