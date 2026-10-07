const express = require('express');
const { body } = require('express-validator');
const { list, newArrivals, getBySlugOrId, create, update, remove } = require('../controllers/products');
const { validate, optNumber } = require('../middleware/validate');
const { requireAuth } = require('../middleware/requireAuth');
const { stripAndTrim } = require('../utils/sanitize');

const router = express.Router();

// IMPORTANT: /new must be registered before /:slugOrId or "new" would be treated as a slug.
router.get('/', list);
router.get('/new', newArrivals);
router.get('/:slugOrId', getBySlugOrId);

// Plain-text bilingual fields: strip HTML tags, then trim, then validate.
// Descriptions are capped at 500 chars (live counter in the admin form).
// NOTE: factory (not a shared array) — express-validator chains are mutable,
// so POST (strict) and PUT (all-optional) each need fresh instances.
// Optional numbers use the shared optNumber() from middleware/validate.

function productValidators(optionalAll) {
  const chains = [
    body('name.ar').customSanitizer(stripAndTrim).notEmpty().withMessage('Arabic name is required'),
    body('name.en').optional().customSanitizer(stripAndTrim).isLength({ max: 200 }).withMessage('English name too long'),
    body('description.ar')
      .customSanitizer(stripAndTrim)
      .notEmpty()
      .withMessage('Arabic description is required')
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or less'),
    body('description.en')
      .optional()
      .customSanitizer(stripAndTrim)
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or less'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be >= 0'),
    // Type check only — the >0 and <price rule needs merged values, so it
    // lives in the controller (create + update) with a clear 400 message.
    optNumber('salePrice', { min: 0, message: 'salePrice must be a number >= 0' }),
    body('stockStatus').optional().isIn(['in', 'out']).withMessage('Invalid stock status'),
    body('isNewArrival').optional().isBoolean().withMessage('isNewArrival must be boolean'),
    optNumber('ageMin', { min: 0, max: 18, message: 'ageMin must be a number between 0 and 18' }),
    optNumber('ageMax', { min: 0, max: 18, message: 'ageMax must be a number between 0 and 18' }),
    // stockQty: absent means "not provided" (model default 0 applies on create).
    optNumber('stockQty', { min: 0, message: 'stockQty must be a number >= 0' }),
  ];
  return optionalAll ? chains.map((c) => c.optional()) : chains;
}

// POST rejects any client-sent slug (400) — slugs are server-generated, once, on creation.
const rejectSlug = [
  body('slug').custom((v) => {
    if (v !== undefined && v !== null && v !== '') throw new Error('Slug is auto-generated and cannot be set');
    return true;
  }),
];

router.post('/', requireAuth, rejectSlug, productValidators(false), validate, create);
// PUT ignores slug silently (controller deletes it) — never changes after creation.
router.put('/:id', requireAuth, productValidators(true), validate, update);
router.delete('/:id', requireAuth, remove);

module.exports = router;
