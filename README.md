Simple Microservice - Login & Movie Database
A clean, simple microservice with user authentication and movie database management.
Features

User Authentication: Register, login, logout with JWT tokens
Session Management: Redis-based sessions with 10-minute expiry
Movie Database: Add, view, update movies with user tracking
Admin Panel: Create/delete users (admin only)
Logging: Complete audit trail for all operations
Security: Password hashing, input validation, XSS protection

Quick Start
Option 1: Docker (Recommended)
bash# Clone/create the project structure
# Add all the files from the artifacts above

# Start with Docker
docker-compose up -d

# Access the application
open http://localhost:3000
Option 2: Local Development
bash# Install dependencies
npm install

# Start Redis (required)
redis-server

# Start the application
npm start
# or for development with auto-restart
npm run dev

# Access the application
open http://localhost:3000
Usage Flow

Browse to http://localhost:3000
Login/Register - Use the login form

Register new users with username and password (min 4 chars)
Login with existing credentials


Movie Database - After successful login:

View all movies
Add new movies with name, actor, genre, description
All updates are tracked by user



API Endpoints
Authentication

POST /api/auth/register - Register new user
POST /api/auth/login - User login
POST /api/auth/logout - User logout

Movies

GET /api/movies - Get all movies (requires auth)
POST /api/movies - Add new movie (requires auth)
PUT /api/movies/:id - Update movie (requires auth)

Admin (requires admin privileges)

POST /api/admin/users - Create user
DELETE /api/admin/users/:username - Delete user
GET /api/admin/users - List all users

Health Check

GET /api/health - Server health status

Configuration
Edit backend/config.js to customize:

JWT secret and expiry time
Database paths
Redis connection
Admin credentials
Port settings

Default Admin Account

Username: admin
Password: admin123

⚠️ Change these in production!
File Structure
simple-microservice/
├── backend/
│   ├── server.js          # Main server
│   ├── config.js          # Configuration
│   ├── security.js        # Auth middleware
│   ├── validation.js      # Input validation
│   ├── database.js        # SQLite database
│   ├── redis-client.js    # Redis session store
│   └── logging.js         # Winston logging
├── frontend/
│   └── index.html         # Single-page React app
├── data/                  # SQLite databases (auto-created)
├── logs/                  # Log files (auto-created)
├── package.json
├── docker-compose.yml
├── Dockerfile
└── README.md
Logging
All operations are logged to:

logs/combined.log - All logs
logs/error.log - Error logs only
logs/auth.log - Authentication events
Console (development mode)

Security Features

Password hashing with bcrypt
JWT tokens with expiry
Redis session management
Input validation with Joi
XSS protection
CORS and Helmet security headers
Admin-only endpoints protection

Production Notes

Change JWT secret in environment variables
Update admin credentials
Use environment variables for Redis URL
Set up proper logging rotation
Configure proper CORS origins
Use HTTPS in production

Error Messages

Invalid credentials: "please login with correct id and pass"
Session expired: "Session expired or invalid"
Admin required: "Admin access required"
Validation errors: Specific field validation messages