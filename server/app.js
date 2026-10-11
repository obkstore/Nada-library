require('dotenv').config();
// Network/DNS policy before anything resolves the Atlas hostname.
require('./config/network');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const fs = require('fs');
const { getDbStatus } = require('./config/db');
const { cloudinaryConfigured } = require('./config/cloudinary');
const { errorHandler } = require('./middleware/validate');
const { isServerless } = require('./config/network');

const isProd = process.env.NODE_ENV === 'production';

// ---- Fail-fast checks in production (weak/missing JWT, missing Cloudinary) ----
// Runs in BOTH runtimes (long-lived server and serverless cold starts).
if (isProd) {
  const secret = process.env.JWT_SECRET || '';
  if (!secret || secret.length < 32 || secret.includes('change-me')) {
    console.error('FATAL: JWT_SECRET must be set to a strong random value (min 32 chars) in production.');
    process.exit(1);
  }
  if (!cloudinaryConfigured()) {
    console.error('FATAL: Cloudinary env vars are required in production (no local-disk fallback).');
    process.exit(1);
  }
}

const app = express();

// Behind proxies Express must trust the first proxy hop so req.ip — used by
// the login rate limiter — is the real client IP, not the proxy's.
// trust proxy "1" trusts exactly one hop (platform router). On serverless the
// limiter additionally prefers the x-nf-client-connection-ip header.
app.set('trust proxy', 1);

// helmet with crossOriginResourcePolicy "cross-origin" so /uploads images load from Vite dev server
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '2mb' }));
app.use(mongoSanitize());
app.use(morgan(isProd ? 'combined' : 'dev'));

// Local /uploads exists only as a dev fallback (production is Cloudinary-only
// via the fail-fast check above). Ensure the dir exists outside production so
// the static route — and any local write — never crashes on a missing folder;
// skip it entirely in production AND on serverless (read-only filesystem,
// isServerless() covers Netlify/Lambda).
if (!isProd && !isServerless()) {
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir));
}

// Browser-visible liveness + database status (dbError is a short message or null).
app.get('/api/health', (req, res) => {
  const db = getDbStatus();
  return res.json({ ok: true, db: db.status, dbError: db.error, env: process.env.NODE_ENV || 'development' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/supply-lists', require('./routes/supplyLists'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/upload', require('./routes/upload'));

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use(errorHandler);

module.exports = app;
