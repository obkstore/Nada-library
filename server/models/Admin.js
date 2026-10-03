const mongoose = require('mongoose');

// Admin user. Seed credentials come from env (ADMIN_USERNAME / ADMIN_PASSWORD),
// never hardcoded. Password stored as bcrypt hash.
const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 50 },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
