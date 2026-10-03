const express = require('express');
const { body } = require('express-validator');
const { list, getOne, create, update, remove } = require('../controllers/supplyLists');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/requireAuth');
const { stripAndTrim } = require('../utils/sanitize');

const router = express.Router();

router.get('/', list);
router.get('/:id', getOne);
router.post(
  '/',
  requireAuth,
  [
    body('title.ar').customSanitizer(stripAndTrim).notEmpty().withMessage('Arabic title is required'),
    body('title.en').optional().customSanitizer(stripAndTrim),
    body('school.ar').optional().customSanitizer(stripAndTrim),
    body('school.en').optional().customSanitizer(stripAndTrim),
    body('grade.ar').optional().customSanitizer(stripAndTrim),
    body('grade.en').optional().customSanitizer(stripAndTrim),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product').notEmpty().withMessage('Product is required'),
    body('items.*.qty').isInt({ min: 1 }).withMessage('Quantity must be >= 1'),
    // Type checks only — the "below regular total" rule needs live prices,
    // so it lives in the controller (create + update) with a clear 400 message.
    body('bundlePrice').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('bundlePrice must be a number >= 0'),
    body('isFeatured').optional().isBoolean().withMessage('isFeatured must be boolean'),
    body('items.*.product').notEmpty().withMessage('Product is required'),
    body('items.*.qty').isInt({ min: 1 }).withMessage('Quantity must be >= 1'),
  ],
  validate,
  create
);
router.put('/:id', requireAuth, update);
router.delete('/:id', requireAuth, remove);

module.exports = router;
