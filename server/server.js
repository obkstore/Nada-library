// Local-dev entry point: imports the shared Express app and listens.
// (Serverless uses netlify/functions/api.js instead — never this file.)
require('dotenv').config();
require('./config/network');
const mongoose = require('mongoose');
const { connectDB, getDbStatus, shortMessage, markDisconnected, watchConnection } = require('./config/db');
const { initCloudinary, cloudinaryConfigured } = require('./config/cloudinary');
const { isServerless } = require('./config/network');
const app = require('./app');

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;

// Resilient startup: listen FIRST so the platform health check and the API
// stay up, then connect to MongoDB in the background. A failed connection
// logs the FULL error once, records a short message for /api/health, and
// retries every 10 seconds instead of crashing the process.
// The retry interval is long-lived-process only — never started serverless.
let dbFirstFailureLogged = false;

async function ensureDbConnection() {
  if (mongoose.connection.readyState === 1) return; // already connected
  try {
    await connectDB();
    dbFirstFailureLogged = false; // a future outage logs in full once again
  } catch (err) {
    markDisconnected(err);
    if (!dbFirstFailureLogged) {
      console.error('MongoDB connection failed: ' + (err && err.message ? err.message : err));
      dbFirstFailureLogged = true;
    } else {
      console.error('MongoDB retry failed: ' + shortMessage(err));
    }
  }
}

watchConnection();

const cloud = initCloudinary();
if (cloud) console.log('Image storage: Cloudinary');
else {
  console.warn(
    isProd
      ? 'Image storage: NO PROVIDER (will exit — see fail-fast check)'
      : 'Image storage: local disk (server/uploads). Set Cloudinary env vars to use Cloudinary.'
  );
}

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  void ensureDbConnection(); // background: never blocks listening
});

if (!isServerless()) {
  setInterval(() => {
    void ensureDbConnection();
  }, 10000);
}

module.exports = app;
