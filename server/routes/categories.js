const express = require('express');
const { body } = require('express-validator');
const { list, getBySlug, create, update, remove } = require('../controllers/categories');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/requireAuth');
const { stripAndTrim } = require('../utils/sanitize');

const router = express.Router();

router.get('/', list);
router.get('/:slug', getBySlug);
router.post(
  '/',
  requireAuth,
  [
    body('name.ar').customSanitizer(stripAndTrim).notEmpty().withMessage('Arabic name is required'),
    body('name.en').optional().customSanitizer(stripAndTrim),
  ],
  validate,
  create
);
router.put(
  '/:id',
  requireAuth,
  [body('name.ar').optional().customSanitizer(stripAndTrim).notEmpty().withMessage('Arabic name cannot be empty')],
  validate,
  update
);
router.delete('/:id', requireAuth, remove);

module.exports = router;
