const express = require('express');
const { body } = require('express-validator');
const { login, me, changePassword } = require('../controllers/auth');
const { validate } = require('../middleware/validate');
const { loginLimiter } = require('../middleware/loginLimiter');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.post(
  '/login',
  loginLimiter,
  [body('username').trim().notEmpty().withMessage('Username is required'), body('password').notEmpty().withMessage('Password is required')],
  validate,
  login
);

router.get('/me', requireAuth, me);

router.put(
  '/password',
  requireAuth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validate,
  changePassword
);

module.exports = router;
