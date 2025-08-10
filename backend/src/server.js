const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import our modules
const config = require('./config');
const database = require('./database');
const redisClient = require('./redis-client');
const { verifyToken, requireAdmin, verifyPassword, generateToken } = require('./security');
const { validateUser, validateMovie } = require('./validation');
const { logger, logAuth, logMovieUpdate, logAdminAction } = require('./logging');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// === AUTHENTICATION ENDPOINTS ===

// POST /api/auth/register - Register new user
app.post('/api/auth/register', validateUser, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user exists
    const existingUser = await database.findUser(username);
    if (existingUser) {
      logAuth('REGISTER_FAILED', username, false, { reason: 'User already exists' });
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create user
    await database.createUser(username, password);
    logAuth('REGISTER_SUCCESS', username, true);
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login - User login
app.post('/api/auth/login', validateUser, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user in database
    const user = await database.findUser(username);
    if (!user) {
      logAuth('LOGIN_FAILED', username, false, { reason: 'User not found' });
      return res.status(401).json({ error: 'please login with correct id and pass' });
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      logAuth('LOGIN_FAILED', username, false, { reason: 'Invalid password' });
      return res.status(401).json({ error: 'please login with correct id and pass' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Store session in Redis (expires in 10 minutes)
    await redisClient.setUserSession(token, {
      username: user.username,
      isAdmin: user.is_admin === 1
    });
    
    logAuth('LOGIN_SUCCESS', username, true);
    
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

// POST /api/auth/logout - User logout
app.post('/api/auth/logout', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await redisClient.deleteUserSession(token);
    
    logAuth('LOGOUT_SUCCESS', req.user.username, true);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// === MOVIE ENDPOINTS ===

// GET /api/movies - Get all movies (requires auth)
app.get('/api/movies', verifyToken, async (req, res) => {
  try {
    const movies = await database.getAllMovies();
    res.json(movies);
  } catch (error) {
    logger.error('Get movies error:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// POST /api/movies - Add new movie (requires auth)
app.post('/api/movies', verifyToken, validateMovie, async (req, res) => {
  try {
    const movie = await database.createMovie(req.body, req.user.username);
    logMovieUpdate('MOVIE_CREATED', movie.id, req.user.username, req.body);
    res.status(201).json(movie);
  } catch (error) {
    logger.error('Create movie error:', error);
    res.status(500).json({ error: 'Failed to create movie' });
  }
});

// PUT /api/movies/:id - Update movie (requires auth)
app.put('/api/movies/:id', verifyToken, validateMovie, async (req, res) => {
  try {
    const movieId = req.params.id;
    const updated = await database.updateMovie(movieId, req.body, req.user.username);
    
    if (!updated) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    logMovieUpdate('MOVIE_UPDATED', movieId, req.user.username, req.body);
    res.json({ message: 'Movie updated successfully' });
  } catch (error) {
    logger.error('Update movie error:', error);
    res.status(500).json({ error: 'Failed to update movie' });
  }
});

// === ADMIN ENDPOINTS ===

// POST /api/admin/users - Create user (requires admin auth)
app.post('/api/admin/users', verifyToken, requireAdmin, validateUser, async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await database.findUser(username);
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const user = await database.createUser(username, password);
    logAdminAction('USER_CREATED', req.user.username, username);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    logger.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/admin/users/:username - Delete user (requires admin auth)
app.delete('/api/admin/users/:username', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const deleted = await database.deleteUser(username);
    
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    logAdminAction('USER_DELETED', req.user.username, username);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/users - List all users (requires admin auth)
app.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await database.getAllUsers();
    res.json(users);
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// === HEALTH CHECK ===
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    redis: redisClient.isConnected() ? 'connected' : 'disconnected'
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
  console.log(`🚀 Server running on http://localhost:${config.PORT}`);
});
