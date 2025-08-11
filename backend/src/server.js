/**
 * @fileoverview Movie List Microservice API Server
 * 
 * This module implements a RESTful API server for managing movies and users
 * with JWT-based authentication, Redis session management, and comprehensive logging.
 * 
 * @author Development Team
 * @version 1.0.0
 * @since 2024-08-12
 */

// =============================================================================
// DEPENDENCIES
// =============================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Internal module imports
const config = require('./config');
const database = require('./database');
const redisClient = require('./redis-client');
const { verifyToken, requireAdmin, verifyPassword, generateToken } = require('./security');
const { validateUser, validateMovie } = require('./validation');
const { logger, logAuth, logMovieUpdate, logAdminAction } = require('./logging');

// =============================================================================
// APPLICATION SETUP
// =============================================================================

/**
 * Express application instance
 * @type {express.Application}
 */
const app = express();

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

/**
 * Security middleware configuration
 * - helmet(): Sets various HTTP headers for security
 * - cors(): Enables Cross-Origin Resource Sharing
 * - express.json(): Parses incoming JSON requests
 */
app.use(helmet());
app.use(cors());
app.use(express.json());

/**
 * Static file serving for frontend assets
 * Serves files from the ../frontend directory
 */
app.use(express.static(path.join(__dirname, '../frontend')));

// =============================================================================
// AUTHENTICATION ENDPOINTS
// =============================================================================

/**
 * POST /api/auth/register
 * 
 * Registers a new user account in the system.
 * 
 * @route POST /api/auth/register
 * @middleware validateUser - Validates request body format
 * @param {Object} req.body - Request body
 * @param {string} req.body.username - Username for new account
 * @param {string} req.body.password - Password for new account
 * @returns {Object} 201 - Success message
 * @returns {Object} 400 - Username already exists
 * @returns {Object} 500 - Registration failed
 * 
 * @example
 * POST /api/auth/register
 * Content-Type: application/json
 * {
 *   "username": "john_doe",
 *   "password": "securepass123"
 * }
 */
app.post('/api/auth/register', validateUser, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check for existing user to prevent duplicates
    const existingUser = await database.findUser(username);
    if (existingUser) {
      logAuth('REGISTER_FAILED', username, false, { reason: 'User already exists' });
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create new user with hashed password
    await database.createUser(username, password);
    logAuth('REGISTER_SUCCESS', username, true);
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * 
 * Authenticates user credentials and returns JWT token with session.
 * 
 * @route POST /api/auth/login
 * @middleware validateUser - Validates request body format
 * @param {Object} req.body - Request body
 * @param {string} req.body.username - User's username
 * @param {string} req.body.password - User's password
 * @returns {Object} 200 - Authentication successful with token and user info
 * @returns {Object} 401 - Invalid credentials
 * @returns {Object} 500 - Login failed
 * 
 * @example
 * POST /api/auth/login
 * Content-Type: application/json
 * {
 *   "username": "john_doe",
 *   "password": "securepass123"
 * }
 * 
 * Response:
 * {
 *   "message": "Login successful",
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "user": {
 *     "username": "john_doe",
 *     "isAdmin": false
 *   }
 * }
 */
app.post('/api/auth/login', validateUser, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Retrieve user from database
    const user = await database.findUser(username);
    if (!user) {
      logAuth('LOGIN_FAILED', username, false, { reason: 'User not found' });
      return res.status(401).json({ error: 'please login with correct id and pass' });
    }
    
    // Verify provided password against stored hash
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      logAuth('LOGIN_FAILED', username, false, { reason: 'Invalid password' });
      return res.status(401).json({ error: 'please login with correct id and pass' });
    }
    
    // Generate JWT token for authenticated session
    const token = generateToken(user);
    
    // Store session data in Redis with 10-minute expiration
    await redisClient.setUserSession(token, {
      username: user.username,
      isAdmin: user.is_admin === 1
    });
    
    logAuth('LOGIN_SUCCESS', username, true);
    
    // Return successful authentication response
    res.json({
      message: 'Login successful',
      token,
      user: {
        username: user.username,
        isAdmin: user.is_admin === 1
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * 
 * Logs out authenticated user by invalidating their session.
 * 
 * @route POST /api/auth/logout
 * @middleware verifyToken - Requires valid JWT token
 * @param {string} req.headers.authorization - Bearer token
 * @returns {Object} 200 - Logout successful
 * @returns {Object} 401 - Invalid or missing token
 * @returns {Object} 500 - Logout failed
 * 
 * @example
 * POST /api/auth/logout
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 */
app.post('/api/auth/logout', verifyToken, async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    // Remove session from Redis cache
    await redisClient.deleteUserSession(token);
    
    logAuth('LOGOUT_SUCCESS', req.user.username, true);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// =============================================================================
// MOVIE MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/movies
 * 
 * Retrieves all movies from the database for authenticated users.
 * 
 * @route GET /api/movies
 * @middleware verifyToken - Requires valid JWT token
 * @returns {Array<Object>} 200 - Array of movie objects
 * @returns {Object} 401 - Authentication required
 * @returns {Object} 500 - Failed to fetch movies
 * 
 * @example
 * GET /api/movies
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * 
 * Response:
 * [
 *   {
 *     "id": 1,
 *     "name": "The Matrix",
 *     "actor": "Keanu Reeves",
 *     "genre": "Sci-Fi",
 *     "description": "A computer programmer discovers reality is a simulation",
 *     "created_at": "2024-08-12T10:30:00.000Z",
 *     "updated_by": "admin"
 *   }
 * ]
 */
app.get('/api/movies', verifyToken, async (req, res) => {
  try {
    const movies = await database.getAllMovies();
    res.json(movies);
  } catch (error) {
    logger.error('Get movies error:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

/**
 * POST /api/movies
 * 
 * Creates a new movie entry in the database.
 * 
 * @route POST /api/movies
 * @middleware verifyToken - Requires valid JWT token
 * @middleware validateMovie - Validates movie data format
 * @param {Object} req.body - Movie data
 * @param {string} req.body.name - Movie title
 * @param {string} req.body.actor - Primary actor
 * @param {string} req.body.genre - Movie genre
 * @param {string} req.body.description - Movie description
 * @returns {Object} 201 - Created movie object
 * @returns {Object} 400 - Invalid movie data
 * @returns {Object} 401 - Authentication required
 * @returns {Object} 500 - Failed to create movie
 * 
 * @example
 * POST /api/movies
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * Content-Type: application/json
 * {
 *   "name": "Inception",
 *   "actor": "Leonardo DiCaprio",
 *   "genre": "Thriller",
 *   "description": "A thief who steals corporate secrets through dream-sharing technology"
 * }
 */
app.post('/api/movies', verifyToken, validateMovie, async (req, res) => {
  try {
    // Create movie with authenticated user as the creator
    const movie = await database.createMovie(req.body, req.user.username);
    
    // Log movie creation for audit trail
    logMovieUpdate('MOVIE_CREATED', movie.id, req.user.username, req.body);
    
    res.status(201).json(movie);
  } catch (error) {
    logger.error('Create movie error:', error);
    res.status(500).json({ error: 'Failed to create movie' });
  }
});

/**
 * PUT /api/movies/:id
 * 
 * Updates an existing movie by ID.
 * 
 * @route PUT /api/movies/:id
 * @middleware verifyToken - Requires valid JWT token
 * @middleware validateMovie - Validates movie data format
 * @param {string} req.params.id - Movie ID to update
 * @param {Object} req.body - Updated movie data
 * @param {string} req.body.name - Movie title
 * @param {string} req.body.actor - Primary actor
 * @param {string} req.body.genre - Movie genre
 * @param {string} req.body.description - Movie description
 * @returns {Object} 200 - Update successful message
 * @returns {Object} 400 - Invalid movie data
 * @returns {Object} 401 - Authentication required
 * @returns {Object} 404 - Movie not found
 * @returns {Object} 500 - Failed to update movie
 * 
 * @example
 * PUT /api/movies/1
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * Content-Type: application/json
 * {
 *   "name": "The Matrix Reloaded",
 *   "actor": "Keanu Reeves",
 *   "genre": "Action",
 *   "description": "Updated description"
 * }
 */
app.put('/api/movies/:id', verifyToken, validateMovie, async (req, res) => {
  try {
    const movieId = req.params.id;
    
    // Attempt to update movie in database
    const updated = await database.updateMovie(movieId, req.body, req.user.username);
    
    // Check if movie was found and updated
    if (!updated) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    // Log movie update for audit trail
    logMovieUpdate('MOVIE_UPDATED', movieId, req.user.username, req.body);
    
    res.json({ message: 'Movie updated successfully' });
  } catch (error) {
    logger.error('Update movie error:', error);
    res.status(500).json({ error: 'Failed to update movie' });
  }
});

// =============================================================================
// ADMINISTRATIVE ENDPOINTS
// =============================================================================

/**
 * POST /api/admin/users
 * 
 * Creates a new user account (admin only).
 * 
 * @route POST /api/admin/users
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requireAdmin - Requires admin privileges
 * @middleware validateUser - Validates user data format
 * @param {Object} req.body - User data
 * @param {string} req.body.username - Username for new account
 * @param {string} req.body.password - Password for new account
 * @returns {Object} 201 - User created successfully
 * @returns {Object} 400 - Username already exists or invalid data
 * @returns {Object} 401 - Authentication required
 * @returns {Object} 403 - Admin privileges required
 * @returns {Object} 500 - Failed to create user
 * 
 * @example
 * POST /api/admin/users
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * Content-Type: application/json
 * {
 *   "username": "new_user",
 *   "password": "securepass123"
 * }
 */
app.post('/api/admin/users', verifyToken, requireAdmin, validateUser, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Prevent duplicate usernames
    const existingUser = await database.findUser(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create new user account
    const user = await database.createUser(username, password);
    
    // Log administrative action for security audit
    logAdminAction('USER_CREATED', req.user.username, username);
    
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    logger.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * DELETE /api/admin/users/:username
 * 
 * Deletes a user account by username (admin only).
 * 
 * @route DELETE /api/admin/users/:username
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requireAdmin - Requires admin privileges
 * @param {string} req.params.username - Username to delete
 * @returns {Object} 200 - User deleted successfully
 * @returns {Object} 401 - Authentication required
 * @returns {Object} 403 - Admin privileges required
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Failed to delete user
 * 
 * @example
 * DELETE /api/admin/users/john_doe
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 */
app.delete('/api/admin/users/:username', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    
    // Attempt to delete user from database
    const deleted = await database.deleteUser(username);
    
    // Check if user was found and deleted
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log administrative action for security audit
    logAdminAction('USER_DELETED', req.user.username, username);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * GET /api/admin/users
 * 
 * Retrieves all user accounts (admin only).
 * 
 * @route GET /api/admin/users
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requireAdmin - Requires admin privileges
 * @returns {Array<Object>} 200 - Array of user objects
 * @returns {Object} 401 - Authentication required
 * @returns {Object} 403 - Admin privileges required
 * @returns {Object} 500 - Failed to fetch users
 * 
 * @example
 * GET /api/admin/users
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * 
 * Response:
 * [
 *   {
 *     "id": 1,
 *     "username": "admin",
 *     "is_admin": true,
 *     "created_at": "2024-08-12T08:00:00.000Z"
 *   },
 *   {
 *     "id": 2,
 *     "username": "john_doe",
 *     "is_admin": false,
 *     "created_at": "2024-08-12T09:15:00.000Z"
 *   }
 * ]
 */
app.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await database.getAllUsers();
    res.json(users);
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// =============================================================================
// UTILITY ENDPOINTS
// =============================================================================

/**
 * GET /api/health
 * 
 * Health check endpoint for monitoring service status.
 * Returns system status and dependency connectivity.
 * 
 * @route GET /api/health
 * @returns {Object} 200 - Health status information
 * 
 * @example
 * GET /api/health
 * 
 * Response:
 * {
 *   "status": "healthy",
 *   "timestamp": "2024-08-12T10:30:00.000Z",
 *   "redis": "connected"
 * }
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    redis: redisClient.isConnected() ? 'connected' : 'disconnected'
  });
});

// =============================================================================
// FRONTEND ROUTING
// =============================================================================

/**
 * Catch-all route handler for single-page application (SPA) support.
 * Serves the main index.html file for any unmatched routes,
 * enabling client-side routing functionality.
 * 
 * @route GET *
 * @param {string} * - Any unmatched route path
 * @returns {File} index.html - Main application HTML file
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Global error handling middleware.
 * Catches and logs unhandled errors, returning a generic error response.
 * 
 * @param {Error} error - The error object
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 * @returns {Object} 500 - Internal server error response
 */
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

/**
 * Start the HTTP server and listen on configured port.
 * Logs server startup information for monitoring and debugging.
 * 
 * @listens {number} config.PORT - Port number from configuration
 */
app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
  console.log(`🚀 Server running on http://localhost:${config.PORT}`);
});
