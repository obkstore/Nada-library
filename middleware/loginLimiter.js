const rateLimit = require('express-rate-limit');

// Brute-force protection on admin login.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, try again later' },
});

module.exports = { loginLimiter };
