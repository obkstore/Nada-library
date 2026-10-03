const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    // Generic message to avoid user enumeration.
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    return res.json({ token, username: admin.username });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res) {
  return res.json({ id: req.admin.id, username: req.admin.username });
}

// PUT /api/auth/password (admin only) — change password.
// Body: { currentPassword, newPassword>=8 }. Wrong current password → 401.
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });
    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await admin.save();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, me, changePassword };
