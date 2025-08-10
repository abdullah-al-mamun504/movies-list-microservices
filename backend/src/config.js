module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: '10m',

  // Users DB (internal Docker connection)
  PG_USERS_USER: process.env.USERS_DB_USER,
  PG_USERS_PASSWORD: process.env.USERS_DB_PASSWORD,
  PG_USERS_HOST: process.env.USERS_DB_HOST || 'localhost',
  PG_USERS_PORT: Number(process.env.USERS_DB_PORT) || 5432,
  PG_USERS_DB: process.env.USERS_DB_NAME,

  // Movies DB (use internal container port)
  PG_MOVIES_USER: process.env.MOVIES_DB_USER,
  PG_MOVIES_PASSWORD: process.env.MOVIES_DB_PASSWORD,
  PG_MOVIES_HOST: process.env.MOVIES_DB_HOST || 'localhost',
  PG_MOVIES_PORT: Number(process.env.MOVIES_DB_PORT_INTERNAL) || 5432,
  PG_MOVIES_DB: process.env.MOVIES_DB_NAME,

  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS) || 8,

  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
};

