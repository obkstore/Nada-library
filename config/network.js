// Shared network/DNS + MongoDB connection diagnostics.
// Required FIRST (after each entry's own dotenv line) so DNS policy and env
// reads apply before Mongoose ever resolves the Atlas hostname.
// dotenv.config() is idempotent: calling it here AND in each entry is safe and
// guarantees MONGODB_URI / ENABLE_CUSTOM_DNS are loaded however the file runs.
require('dotenv').config();
const dns = require('dns');

// Prefer IPv4 everywhere (VPNs and some resolvers mishandle AAAA for Atlas).
dns.setDefaultResultOrder('ipv4first');

// Gated override: only when explicitly enabled, because replacing the process
// resolvers can break VPN split-DNS for internal hostnames.
if (process.env.ENABLE_CUSTOM_DNS === 'true') {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
  console.log('Network: Overriding process DNS resolvers to 1.1.1.1 / 8.8.8.8');
}

// Force IPv4 at the driver level + fail each attempt after 10s (instead of
// the driver's much longer default hang on black-holed VPN routes).
const CONNECT_OPTS = { family: 4, serverSelectionTimeoutMS: 10000 };

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is missing. Copy server/.env.example to server/.env and set MONGODB_URI (dotenv runs before this check).'
    );
  }
  // Catch the classic paste error: MONGODB_URI=MONGODB_URI=mongodb+srv://...
  // (dotenv splits on the FIRST '=', so the value keeps the extra prefix and
  // the driver rejects it with "Invalid scheme"). Fail loudly, not cryptically.
  if (/^[\w.-]+=mongodb/i.test(uri)) {
    throw new Error(
      'MONGODB_URI looks malformed: it starts with a variable-name prefix. ' +
        'Edit server/.env so the line reads MONGODB_URI=mongodb+srv://... (single prefix).'
    );
  }
  return uri;
}

// NEVER log credentials: mongodb+srv://user:****@host/db
function redactUri(uri) {
  return String(uri || '').replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');
}

// Host portion only (safe for error logs).
function uriHost(uri) {
  const m = String(uri || '').match(/@([^/?:]+)(?::\d+)?(?:\/|$)/);
  if (m) return m[1];
  const m2 = String(uri || '').match(/\/\/([^/?:]+)(?::\d+)?(?:\/|$)/);
  return m2 ? m2[1] : '(unknown host)';
}

// Buckets driver failures so logs can point at DNS vs auth vs network.
function classifyDbError(err) {
  const msg = String((err && err.message) || err || '');
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|EBADNAME|querySrv|DNS/i.test(msg)) return 'DNS resolution';
  if (/bad auth|authentication failed|auth failed/i.test(msg)) return 'authentication';
  if (/MongooseServerSelectionError|ServerSelection|timed out|ETIMEDOUT|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH/i.test(msg)) {
    return 'network timeout/unreachable';
  }
  return 'unknown';
}

function hintForCause(cause, host) {
  if (cause === 'DNS resolution') {
    return (
      `Hint: the Atlas hostname did not resolve. If on VPN, try ENABLE_CUSTOM_DNS=true ` +
      `(or 'false' if split-DNS must win), then run: nslookup ${host}`
    );
  }
  if (cause === 'authentication') {
    return 'Hint: check Atlas username/password and Network Access IP allowlist (VPN exit IP changes often).';
  }
  if (cause === 'network timeout/unreachable') {
    return 'Hint: host resolves but TCP/TLS never completes — check VPN, firewall, and Atlas IP allowlist.';
  }
  return 'Hint: see the full error message above.';
}

module.exports = { CONNECT_OPTS, getMongoUri, redactUri, uriHost, classifyDbError, hintForCause };
