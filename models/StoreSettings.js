const mongoose = require('mongoose');

// Singleton store settings (one document). Currency defaults to new Syrian Pound (SYP).
const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      ar: { type: String, required: true, trim: true, default: 'مكتبة الألعاب والقرطاسية' },
      en: { type: String, trim: true, default: 'Stationery & Toys Library' },
    },
    address: {
      ar: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
    hours: {
      ar: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
    phone: { type: String, trim: true, default: '' },
    whatsappNumber: { type: String, trim: true, default: '' }, // digits only, e.g. 9639XXXXXXXX
    currency: {
      code: { type: String, default: 'SYP' },
      name: {
        ar: { type: String, default: 'الليرة السورية' },
        en: { type: String, default: 'Syrian Pound' },
      },
      symbol: {
        ar: { type: String, default: 'ل.س' },
        en: { type: String, default: 'SYP' },
      },
      decimals: { type: Number, default: 0 },
      symbolPosition: { type: String, enum: ['before', 'after'], default: 'after' },
    },
    digitStyle: { type: String, enum: ['western', 'arabic-indic'], default: 'western' },
    social: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      tiktok: { type: String, default: '' },
    },
    mapEmbedUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
