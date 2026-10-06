require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
// Network/DNS policy + redacted connection logging.
const { CONNECT_OPTS, getMongoUri, redactUri, uriHost } = require('../config/network');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { normalizeArabic } = require('../utils/arabicNormalize');

// Rebuilds searchIndex AND effectivePrice for all products.
// searchIndex: needed after changing normalization rules.
// effectivePrice (change 1: offers): derived salePrice-else-price used for
// price sorting and min/max filters — backfilled here for pre-offer products.
// Usage: npm run reindex
// Safe to run in any env (touches only derived fields, never drops data).
async function main() {
  const uri = getMongoUri();
  console.log(`Reindex: connecting to ${redactUri(uri)} (IPv4, 10s timeout)…`);
  await mongoose.connect(uri, CONNECT_OPTS);
  console.log(`Reindex: connected (${uriHost(uri)}).`);
  const products = await Product.find();
  let updated = 0;
  for (const p of products) {
    const parts = [p.name?.ar, p.name?.en, p.description?.ar, p.description?.en].filter(Boolean);
    const idx = normalizeArabic(parts.join(' '));
    const eff = p.salePrice != null && p.salePrice > 0 ? p.salePrice : p.price;
    if (p.searchIndex !== idx || p.effectivePrice !== eff) {
      p.searchIndex = idx;
      p.effectivePrice = eff;
      // eslint-disable-next-line no-await-in-loop
      await p.save();
      updated += 1;
    }
  }
  console.log(`Reindexed ${products.length} products, updated ${updated}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
