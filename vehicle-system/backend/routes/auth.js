const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hashed, 'user');

  const user = { user_id: info.lastInsertRowid, email, role: 'user' };
  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(user.user_id, 'REGISTER', 'New user registered');
  const token = signToken(user);
  res.status(201).json({ token, user: { user_id: user.user_id, name, email, role: 'user' } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(user.user_id, 'LOGIN', 'Successful login');
  const token = signToken(user);
  res.json({
    token,
    user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
  });
});

router.post('/logout', authenticate, (req, res) => {
  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.user_id, 'LOGOUT', 'User signed out');
  res.json({ message: 'Signed out' });
});

// POST /api/auth/forgot-password  (demo: returns a reset token instead of emailing it)
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'No account with that email' });

  const resetToken = crypto.randomBytes(20).toString('hex');
  const expiry = Date.now() + 1000 * 60 * 30; // 30 minutes
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?').run(
    resetToken,
    expiry,
    user.user_id
  );

  // In production: email this link via nodemailer. For the academic demo we return it directly.
  res.json({ message: 'Password reset token generated', resetToken });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  const user = db
    .prepare('SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?')
    .get(resetToken, Date.now());
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

  const hashed = await bcrypt.hash(newPassword, 10);
  db.prepare(
    'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE user_id = ?'
  ).run(hashed, user.user_id);
  res.json({ message: 'Password updated successfully' });
});

// GET /api/auth/profile
router.get('/profile', authenticate, (req, res) => {
  const user = db
    .prepare('SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?')
    .get(req.user.user_id);
  res.json(user);
});

// PUT /api/auth/profile
router.put('/profile', authenticate, (req, res) => {
  const { name } = req.body;
  db.prepare('UPDATE users SET name = ? WHERE user_id = ?').run(name, req.user.user_id);
  const user = db
    .prepare('SELECT user_id, name, email, role FROM users WHERE user_id = ?')
    .get(req.user.user_id);
  res.json(user);
});

module.exports = router;
