const express = require('express');
const { body } = require('express-validator');
const { upload, saveBuffer, deleteStored } = require('../config/storage');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// POST /api/upload (admin only) — multipart field name: "images" (up to 8 files).
// Returns [{ url }] where url is a Cloudinary URL or a local /uploads/... path.
router.post('/', requireAuth, upload.array('images', 8), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images provided (field name: images)' });
    }
    const out = [];
    for (const f of req.files) {
      // eslint-disable-next-line no-await-in-loop
      const saved = await saveBuffer(f);
      out.push({ url: saved.url });
    }
    return res.status(201).json(out);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/upload — body { url } deletes one stored file (used when admin removes an image).
router.delete(
  '/',
  requireAuth,
  [body('url').notEmpty().withMessage('url is required')],
  validate,
  async (req, res, next) => {
    try {
      await deleteStored(req.body.url);
      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
