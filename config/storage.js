const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { cloudinaryConfigured } = require('./cloudinary');

// Provider abstraction for image storage:
// - Cloudinary when env keys are present.
// - Local disk (server/uploads) otherwise in non-production (with startup warning).
// - Production with no Cloudinary keys -> fail fast (checked in server.js).
//
// The DB stores only URL/path strings so switching providers never breaks products.

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

function usingCloudinary() {
  return cloudinaryConfigured();
}

// Multer: memory storage; we forward the buffer to Cloudinary or write to disk ourselves.
// Limits: only jpg/png/webp, max 5 MB per file (change #7).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only jpg, png and webp images are allowed'));
    }
    cb(null, true);
  },
});

async function saveBuffer(file) {
  // file: multer memory file { buffer, mimetype, originalname }
  if (usingCloudinary()) {
    const { cloudinary } = require('./cloudinary');
    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const publicId = `toyshop/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      public_id: publicId,
      format: ext,
      resource_type: 'image',
    });
    return { url: result.secure_url, publicId: result.public_id };
  }
  // Local disk fallback (dev only)
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
      const full = path.join(UPLOAD_DIR, local);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
  } catch (err) {
    console.warn('deleteStored warning:', err.message);
  }
}

module.exports = { upload, saveBuffer, deleteStored, usingCloudinary, UPLOAD_DIR };
