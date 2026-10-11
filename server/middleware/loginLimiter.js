const rateLimit = require('express-rate-limit');

// Brute-force protection on admin login.
// NOTE: the in-memory store makes this limit PER PROCESS / PER FUNCTION
// INSTANCE on serverless — a distributed store (e.g. Redis) would be needed
// for a global limit. Good enough as abuse friction for a single-admin shop.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Prefer the platform-provided client IP header when present (Netlify sets
  // x-nf-client-connection-ip); otherwise fall back to req.ip (trust proxy
  // is configured in app.js so req.ip is already the real client IP).
  keyGenerator: (req) => req.headers['x-nf-client-connection-ip'] || req.ip,
  message: { message: 'Too many login attempts, try again later' },
});

module.exports = { loginLimiter };
