const Joi = require('joi');

// User validation schemas
const userSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(4).max(50).required() // 4 chars minimum as requested
});

// Movie validation schema
const movieSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  actor: Joi.string().min(1).max(100).required(),
  genre: Joi.string().min(1).max(50).required(),
  description: Joi.string().min(1).max(500).required()
});

// Validation middleware
const validateUser = (req, res, next) => {
  const { error } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validateMovie = (req, res, next) => {
  const { error } = movieSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = { validateUser, validateMovie };
