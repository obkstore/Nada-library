const mongoose = require('mongoose');

const bilingualShort = {
  ar: { type: String, required: [true, 'Arabic value is required'], trim: true, maxlength: 200 },
  en: { type: String, trim: true, maxlength: 200, default: '' },
};

// School supply list, e.g. "Grade 3 Supplies" — products + quantities, total computed on read.
const supplyListSchema = new mongoose.Schema(
  {
    title: { type: bilingualShort, required: true },
    school: {
      ar: { type: String, trim: true, maxlength: 200, default: '' },
      en: { type: String, trim: true, maxlength: 200, default: '' },
    },
    grade: {
      ar: { type: String, trim: true, maxlength: 100, default: '' },
      en: { type: String, trim: true, maxlength: 100, default: '' },
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        qty: { type: Number, required: true, min: [1, 'Quantity must be >= 1'] },
      },
    ],
    // Optional set offer. Must stay below the computed regular total — checked
    // on save AND re-checked on every read (prices may change afterwards).
    bundlePrice: { type: Number, min: [0, 'bundlePrice cannot be negative'], default: null },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupplyList', supplyListSchema);
