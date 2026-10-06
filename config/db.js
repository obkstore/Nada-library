const mongoose = require('mongoose');

// Live connection state for /api/health (browser-visible DB status).
// Updated by connectDB() results and by mongoose connection events
// (covers a database that drops AFTER a successful startup, too).
const dbState = { status: 'disconnected', error: null };

// One-line summary of (often very long) driver errors for the health payload.
function shortMessage(err) {
  const msg = String((err && err.message) || err || 'Unknown database error');
  return msg.split('\n')[0].slice(0, 200);
}

function getDbStatus() {
  // readyState 1 = connected (source of truth when events race the interval).
  if (mongoose.connection.readyState === 1) return { status: 'connected', error: null };
  return { ...dbState };
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing. Copy .env.example to .env and set it.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  dbState.status = 'connected';
  dbState.error = null;
  console.log('MongoDB connected');
}

function markDisconnected(err) {
  // Never touches a healthy connection: only records the outage.
  if (mongoose.connection.readyState !== 1) {
    dbState.status = 'disconnected';
    dbState.error = shortMessage(err);
  }
}

// Fire once at startup (server.js). Guards against unhandled 'error' events
// and late disconnects; the retry loop in server.js does the reconnecting.
function watchConnection() {
  mongoose.connection.on('error', (err) => markDisconnected(err));
  mongoose.connection.on('disconnected', () => markDisconnected(new Error('lost connection to MongoDB')));
}

module.exports = { connectDB, getDbStatus, shortMessage, markDisconnected, watchConnection };
