const mongoose = require('mongoose');
const { CONNECT_OPTS, getMongoUri, redactUri, uriHost, classifyDbError, hintForCause } = require('./network');

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
  const uri = getMongoUri();
  const host = uriHost(uri);
  console.log(`DB: resolving ${host}…`);
  console.log(`DB: connecting to ${redactUri(uri)} (IPv4, 10s timeout)…`);
  try {
    await mongoose.connect(uri, CONNECT_OPTS);
  } catch (err) {
    const cause = classifyDbError(err);
    console.error(`DB: connection FAILED (host: ${host}, cause: ${cause}).`);
    console.error(`DB: exact error: ${err && err.message ? err.message : err}`);
    console.error(`DB: ${hintForCause(cause, host)}`);
    markDisconnected(err);
    throw err; // server.js retry loop decides what happens next
  }
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
