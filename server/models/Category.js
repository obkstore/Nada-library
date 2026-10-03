const mongoose = require('mongoose');

const bilingualRequired = {
  ar: { type: String, required: [true, 'Arabic value is required'], trim: true, maxlength: 200 },
  en: { type: String, trim: true, maxlength: 200, default: '' }, // optional, falls back to Arabic
};

// Categories are managed from the admin, never hardcoded in the client.
const categorySchema = new mongoose.Schema(
  {
    name: { type: bilingualRequired, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    image: { type: String, default: '' }, // URL (Cloudinary) or local path (/uploads/...)
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Helper for display: English falls back to Arabic when empty.
categorySchema.methods.displayName = function (lang) {
  if (lang === 'en' && this.name.en) return this.name.en;
  return this.name.ar;
};

module.exports = mongoose.model('Category', categorySchema);
