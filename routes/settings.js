const express = require('express');
const { body } = require('express-validator');
const { get, update } = require('../controllers/settings');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/requireAuth');
const { stripAndTrim } = require('../utils/sanitize');

const router = express.Router();

router.get('/', get);

// Strip HTML from all admin-editable text fields (plain-text policy).
const textFields = [
  'storeName.ar', 'storeName.en',
  'address.ar', 'address.en',
  'hours.ar', 'hours.en',
  'phone', 'whatsappNumber',
  'currency.code', 'currency.name.ar', 'currency.name.en',
  'currency.symbol.ar', 'currency.symbol.en',
  'social.facebook', 'social.instagram', 'social.tiktok',
  'mapEmbedUrl',
];
const sanitizers = textFields.map((f) => body(f).optional().customSanitizer(stripAndTrim));

router.put('/', requireAuth, sanitizers, validate, update);

module.exports = router;
