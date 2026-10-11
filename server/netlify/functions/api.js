// Netlify Functions entry: wraps the SAME Express app as local dev.
// Cold starts connect (module-level cached pool is reused across warm
// invocations); /api/health reports live DB status either way.
// No models, routes, or response shapes differ from the long-lived server.
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const app = require('../../app');
const { connectDB } = require('../../config/db');

// Cached connection across warm invocations (maxPoolSize 5, see network.js).
// Reset to null on failure so the next invocation retries instead of
// reusing a rejected promise.
let connecting = null;
async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!connecting) connecting = connectDB();
  try {
    await connecting;
  } finally {
    if (mongoose.connection.readyState !== 1) connecting = null;
  }
}

const rawHandler = serverless(app);

module.exports.handler = async (event, context) => {
  // Don't hold the function open for a drained event loop; we await what we need.
  if (context && typeof context === 'object') context.callbackWaitsForEmptyEventLoop = false;

  // Normalize the path so routes ALWAYS resolve as /api/... :
  // - redirect-style: /.netlify/functions/api/<rest> -> strip the prefix
  // - direct-style:  /api/<rest>                  -> pass through untouched
  // - anything else (e.g. bare prefix or /)      -> fall back under /api/
  let path = (event && event.path) || '/';
  path = path.replace(/^\/\.netlify\/functions\/api/, '');
  if (!path.startsWith('/api')) path = '/api' + (path.startsWith('/') ? path : `/${path}`);
  const normalized = { ...event, path };

  // Connect before handling (reuses the warm pool when available). On failure
  // we still run the handler: /api/health reports disconnected, and data
  // routes fail fast via the 10s serverSelectionTimeout instead of hanging.
  try {
    await ensureDb();
  } catch (err) {
    console.error('api: DB unavailable:', err && err.message ? err.message : err);
  }
  return rawHandler(normalized, context);
};
