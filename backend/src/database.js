const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const config = require('./config');

class Database {
  constructor() {
    // Pool for users database
    this.usersPool = new Pool({
      user: config.PG_USERS_USER,
      host: config.PG_USERS_HOST,
      database: config.PG_USERS_DB,
      password: config.PG_USERS_PASSWORD,
      port: config.PG_USERS_PORT,
    });

    // Pool for movies database
    this.moviesPool = new Pool({
      user: config.PG_MOVIES_USER,
      host: config.PG_MOVIES_HOST,
      database: config.PG_MOVIES_DB,
      password: config.PG_MOVIES_PASSWORD,
      port: config.PG_MOVIES_PORT,
    });
  }

  // User operations
  async createUser(username, password, isAdmin = false) {
    const hashedPassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const client = await this.usersPool.connect();
    try {
      const result = await client.query(
        `INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3) RETURNING id, username`,
        [username, hashedPassword, isAdmin]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async findUser(username) {
    const client = await this.usersPool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteUser(username) {
    const client = await this.usersPool.connect();
    try {
      const result = await client.query(
        'DELETE FROM users WHERE username = $1',
        [username]
      );
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async getAllUsers() {
    const client = await this.usersPool.connect();
    try {
      const result = await client.query(
        'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC'
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Movie operations
  async createMovie(movie, updatedBy) {
    const client = await this.moviesPool.connect();
    try {
      const result = await client.query(
        `INSERT INTO movies (name, actor, genre, description, updated_by) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id, name, actor, genre, description`,
        [movie.name, movie.actor, movie.genre, movie.description, updatedBy]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getAllMovies() {
    const client = await this.moviesPool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM movies ORDER BY created_at DESC'
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateMovie(id, movie, updatedBy) {
    const client = await this.moviesPool.connect();
    try {
      const result = await client.query(
        `UPDATE movies SET name = $1, actor = $2, genre = $3, description = $4, 
          updated_by = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`,
        [movie.name, movie.actor, movie.genre, movie.description, updatedBy, id]
      );
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }
}

module.exports = new Database();

