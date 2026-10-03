const mongoose = require('mongoose');
const { normalizeArabic, slugifyEnglish } = require('../utils/arabicNormalize');

const bilingualName = {
  ar: { type: String, required: [true, 'Arabic name is required'], trim: true, maxlength: 200 },
  en: { type: String, trim: true, maxlength: 200, default: '' },
};

const bilingualText = {
  ar: { type: String, required: [true, 'Arabic description is required'], trim: true, maxlength: 500 },
  en: { type: String, trim: true, maxlength: 500, default: '' },
};

const productSchema = new mongoose.Schema(
  {
    name: { type: bilingualName, required: true },
    description: { type: bilingualText, required: true },
    // Unique slug: generated from English name; transliteration/short-id fallback when no English name.
    // Used consistently in API (GET /api/products/:slug) and client routes (/:lang/products/:slug).
    slug: { type: String, unique: true, lowercase: true, trim: true, index: true },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    // Optional offer price. Rules (> 0 and < price) are enforced against MERGED
    // values in the controllers (create + update) and again here as a final guard.
    salePrice: {
      type: Number,
      default: null,
      validate: {
        validator(v) {
          if (v == null) return true;
          return v > 0 && this.price != null && v < this.price;
        },
        message: 'salePrice must be greater than 0 and less than price',
      },
    },
    // Derived on every save: salePrice when set, else price. Used for price
    // sorting and the minPrice/maxPrice filters (see scripts/reindex.js backfill).
    effectivePrice: { type: Number, default: 0, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    images: { type: [String], default: [] }, // stores URL/path strings only (provider-agnostic)
    stockStatus: { type: String, enum: ['in', 'out'], default: 'in', index: true },
    stockQty: { type: Number, default: 0, min: 0 },
    ageMin: { type: Number, min: 0, max: 18 },
    ageMax: { type: Number, min: 0, max: 18 },
    // NOTE: named isNewArrival (not isNew) because Mongoose reserves `isNew` on documents.
    isNewArrival: { type: Boolean, default: false, index: true },
    // Normalized blob for Arabic-tolerant search (rebuilt on save; see scripts/reindex.js for backfill).
    searchIndex: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

function buildSearchIndex(doc) {
  const parts = [doc.name?.ar, doc.name?.en, doc.description?.ar, doc.description?.en].filter(Boolean);
  return normalizeArabic(parts.join(' '));
}

productSchema.pre('validate', async function (next) {
  // Slug is generated ONCE on creation, never on edit (admin form shows it read-only).
  if (this.isNew && !this.slug) {
    const fromEn = slugifyEnglish(this.name?.en);
    this.slug = fromEn || `product-${String(this._id).slice(-6)}`;
  }
  this.searchIndex = buildSearchIndex(this);
  // Derived offer price, refreshed on every save (change: offers).
  this.effectivePrice = this.salePrice != null && this.salePrice > 0 ? this.salePrice : this.price;
  next();
});

// Ensure slug uniqueness by appending a suffix on collision (create path).
productSchema.pre('save', async function (next) {
  if (!this.isModified('slug')) return next();
  const Model = this.constructor;
  let candidate = this.slug;
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Model.findOne({ slug: candidate, _id: { $ne: this._id } }).lean()) {
    candidate = `${this.slug}-${i++}`;
    if (i > 100) break;
  }
  this.slug = candidate;
  next();
});

module.exports = mongoose.model('Product', productSchema);
