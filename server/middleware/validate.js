const { validationResult } = require('express-validator');

// Turns express-validator failures into a consistent 400 payload.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    message: 'Validation failed',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

// Central error handler (must be registered last). Handles multer size/type errors nicely.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Image too large (max 5 MB)' });
  }
  if (err.message === 'Only jpg, png and webp images are allowed') {
    return res.status(400).json({ message: err.message });
  }
  // Mongoose guards (e.g. salePrice < price) surface as client errors, not 500s.
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  return res.status(err.status || 500).json({ message: err.message || 'Server error' });
}

module.exports = { validate, errorHandler };
