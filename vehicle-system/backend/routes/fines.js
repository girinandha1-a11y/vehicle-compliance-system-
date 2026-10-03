const express = require('express');
const db = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/fines/:vehicleId  (supports ?status=Pending|Paid)
router.get('/:vehicleId', authenticate, (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db
      .prepare('SELECT * FROM fines WHERE vehicle_id = ? AND status = ? ORDER BY issued_date DESC')
      .all(req.params.vehicleId, status);
  } else {
    rows = db
      .prepare('SELECT * FROM fines WHERE vehicle_id = ? ORDER BY issued_date DESC')
      .all(req.params.vehicleId);
  }
  res.json(rows);
});

// GET /api/fines/search?violation=&minAmount=&maxAmount=
router.get('/', authenticate, (req, res) => {
  const { violation, minAmount, maxAmount } = req.query;
  let query = 'SELECT * FROM fines WHERE 1=1';
  const params = [];
  if (violation) {
    query += ' AND violation_type LIKE ?';
    params.push(`%${violation}%`);
  }
  if (minAmount) {
    query += ' AND amount >= ?';
    params.push(Number(minAmount));
  }
  if (maxAmount) {
    query += ' AND amount <= ?';
    params.push(Number(maxAmount));
  }
  res.json(db.prepare(query).all(...params));
});

// POST /api/fine/add  (admin only)
router.post('/add', authenticate, requireAdmin, (req, res) => {
  const { vehicle_id, violation_type, amount, issued_date } = req.body;
  if (!vehicle_id || !violation_type || !amount || !issued_date) {
    return res.status(400).json({ error: 'vehicle_id, violation_type, amount, issued_date are required' });
  }
  const info = db
    .prepare(
      'INSERT INTO fines (vehicle_id, violation_type, amount, status, issued_date) VALUES (?, ?, ?, ?, ?)'
    )
    .run(vehicle_id, violation_type, amount, 'Pending', issued_date);

  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(
    req.user.user_id,
    'ADD_FINE',
    `fine_id=${info.lastInsertRowid} vehicle_id=${vehicle_id}`
  );

  res.status(201).json({ fine_id: info.lastInsertRowid });
});

// PUT /api/fine/:fineId/pay
router.put('/:fineId/pay', authenticate, requireAdmin, (req, res) => {
  const fine = db.prepare('SELECT * FROM fines WHERE fine_id = ?').get(req.params.fineId);
  if (!fine) return res.status(404).json({ error: 'Fine not found' });
  db.prepare("UPDATE fines SET status = 'Paid' WHERE fine_id = ?").run(req.params.fineId);
  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.user_id, 'ADMIN_MARK_FINE_PAID', `fine_id=${req.params.fineId}`);
  res.json({ message: 'Fine marked as paid' });
});

module.exports = router;
