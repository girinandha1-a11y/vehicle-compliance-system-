const express = require('express');
const db = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/cases/:vehicleId  (supports ?status=Active|Closed)
router.get('/:vehicleId', authenticate, (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db
      .prepare('SELECT * FROM cases WHERE vehicle_id = ? AND status = ? ORDER BY hearing_date')
      .all(req.params.vehicleId, status);
  } else {
    rows = db
      .prepare('SELECT * FROM cases WHERE vehicle_id = ? ORDER BY hearing_date')
      .all(req.params.vehicleId);
  }
  res.json(rows);
});

// POST /api/case/add  (admin only)
router.post('/add', authenticate, requireAdmin, (req, res) => {
  const { vehicle_id, case_type, description, hearing_date } = req.body;
  if (!vehicle_id || !case_type) {
    return res.status(400).json({ error: 'vehicle_id and case_type are required' });
  }
  const info = db
    .prepare(
      'INSERT INTO cases (vehicle_id, case_type, description, hearing_date, status) VALUES (?, ?, ?, ?, ?)'
    )
    .run(vehicle_id, case_type, description || '', hearing_date || null, 'Active');
  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.user_id, 'ADD_CASE', `case_id=${info.lastInsertRowid} vehicle_id=${vehicle_id}`);
  res.status(201).json({ case_id: info.lastInsertRowid });
});

// PUT /api/case/:caseId/close
router.put('/:caseId/close', authenticate, requireAdmin, (req, res) => {
  db.prepare("UPDATE cases SET status = 'Closed' WHERE case_id = ?").run(req.params.caseId);
  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.user_id, 'CLOSE_CASE', `case_id=${req.params.caseId}`);
  res.json({ message: 'Case closed' });
});

module.exports = router;
