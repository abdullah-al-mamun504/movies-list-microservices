const { createClient } = require('redis');
const config = require('./config');
const { logger } = require('./logging');  // Use destructuring import

class RedisClient {
  constructor() {
    this.client = createClient({
      url: config.REDIS_URL
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    this.connect();
  }

  async connect() {
    try {
      await this.client.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed:', error);
    }
  }

  async setUserSession(token, userData) {
    try {
      await this.client.setEx(`session:${token}`, 600, JSON.stringify(userData)); // 10 minutes = 600 seconds
      return true;
    } catch (error) {
      logger.error('Redis setUserSession error:', error);
      return false;
    }
  }

  async getUserSession(token) {
    try {
      const data = await this.client.get(`session:${token}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis getUserSession error:', error);
      return null;
    }
  }

  async deleteUserSession(token) {
    try {
      await this.client.del(`session:${token}`);
      return true;
    } catch (error) {
      logger.error('Redis deleteUserSession error:', error);
      return false;
    }
  }

  isConnected() {
    return this.client.isOpen;
  }
}

module.exports = new RedisClient();
