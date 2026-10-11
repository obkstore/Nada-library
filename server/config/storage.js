const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { cloudinaryConfigured } = require('./cloudinary');
const { isServerless } = require('./network');

// Provider abstraction for image storage:
// - Cloudinary when env keys are present.
// - Local disk (server/uploads) otherwise in non-production, non-serverless dev
//   (with startup warning).
// - Production with no Cloudinary keys -> fail fast (checked in app.js).
// - Serverless (read-only filesystem, e.g. Netlify) -> Cloudinary only; if the
//   keys are missing the upload fails with a clear error instead of writing.
//
// Netlify caps request bodies (~6 MB, and binary grows ~1/3 in transit), so the
// per-file limit is 4 MB. The admin client pre-compresses to under 1 MB.
//
// The DB stores only URL/path strings so switching providers never breaks products.

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 4 * 1024 * 1024;

function usingCloudinary() {
  return cloudinaryConfigured();
}

// Multer: memory storage; we forward the buffer to Cloudinary or write to disk ourselves.
// Limits: only jpg/png/webp, max 4 MB per file.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 8 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only jpg, png and webp images are allowed'));
    }
    cb(null, true);
  },
});

function extensionFor(mimetype) {
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return 'jpg';
}

// Cloudinary streaming upload (works in every runtime — no temp files, no
// base64 data-URI inflation, safe for serverless memory limits).
function uploadToCloudinary(file) {
  const { cloudinary } = require('./cloudinary');
  const publicId = `toyshop/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, format: extensionFor(file.mimetype), resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  }).then((result) => ({ url: result.secure_url, publicId: result.public_id }));
}

async function saveBuffer(file) {
  // file: multer memory file { buffer, mimetype, originalname }
  if (isServerless()) {
    if (!cloudinaryConfigured()) {
      throw new Error('Image storage is not configured (set Cloudinary env vars)');
    }
    return uploadToCloudinary(file);
  }
  if (usingCloudinary()) return uploadToCloudinary(file);
  // Local disk fallback (dev only)
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(file.mimetype)}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), file.buffer);
  return { url: `/uploads/${name}`, publicId: null, fileName: name };
}

function extractLocalFileName(stored) {
  if (!stored || !stored.startsWith('/uploads/')) return null;
  return path.basename(stored);
}

async function deleteStored(stored) {
  // Delete the stored file when an image or product is removed (change #7).
  if (!stored) return;
  try {
    if (stored.includes('res.cloudinary.com')) {
      // Best-effort: derive public_id from URL tail (works for our `toyshop/<id>` uploads).
      const { cloudinary } = require('./cloudinary');
      const match = stored.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
      if (match) await cloudinary.uploader.destroy(match[1]);
      return;
    }
    const local = extractLocalFileName(stored);
    if (local) {
      // No local files can exist on serverless (read-only fs) — nothing to do.
      if (isServerless()) return;
      const full = path.join(UPLOAD_DIR, local);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
  } catch (err) {
    console.warn('deleteStored warning:', err.message);
  }
}

module.exports = { upload, saveBuffer, deleteStored, usingCloudinary, UPLOAD_DIR };
