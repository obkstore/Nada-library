const cloudinary = require('cloudinary').v2;

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function initCloudinary() {
  if (!cloudinaryConfigured()) return false;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return true;
}

// Auto-apply on import: every entry loads dotenv before requiring this
// module, so env is ready here. Idempotent per process, cold-start safe.
initCloudinary();

module.exports = { cloudinary, cloudinaryConfigured, initCloudinary };
