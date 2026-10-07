const { body, validationResult } = require('express-validator');

// Turns express-validator failures into a consistent 400 payload.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    message: 'Validation failed',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

// Optional-number rule shared by product/supply-list routes: undefined, null,
// and "" (even whitespace-only) all mean "not provided" and skip validation
// entirely — a field is validated ONLY when a real value is present.
function optNumber(field, { min, max, message }) {
  return body(field).custom((v) => {
    if (v === undefined || v === null) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`${field} must be a number`);
    if (min !== undefined && n < min) throw new Error(message || `${field} must be >= ${min}`);
    if (max !== undefined && n > max) throw new Error(message || `${field} must be <= ${max}`);
    return true;
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

module.exports = { validate, optNumber, errorHandler };
