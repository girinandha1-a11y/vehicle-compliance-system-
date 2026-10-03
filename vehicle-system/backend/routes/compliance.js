const express = require('express');
const db = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function statusFor(dateStr) {
  if (!dateStr) return 'Unknown';
  const today = new Date().toISOString().slice(0, 10);
  const expiry = String(dateStr).slice(0, 10);
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 30);
  if (expiry < today) return 'Expired';
  if (expiry < soon.toISOString().slice(0, 10)) return 'Expiring Soon';
  return 'Valid';
}

// GET /api/compliance/:vehicleId
router.get('/:vehicleId', authenticate, (req, res) => {
  const row = db
    .prepare('SELECT * FROM compliance WHERE vehicle_id = ?')
    .get(req.params.vehicleId);
  if (!row) return res.status(404).json({ error: 'No compliance record found' });

  res.json({
    ...row,
    insurance_status: statusFor(row.insurance_expiry),
    pollution_status: statusFor(row.pollution_expiry),
    fitness_status: statusFor(row.fitness_expiry),
    tax_expiry_status: statusFor(row.tax_expiry),
  });
});

// POST /api/compliance/update  (admin only, upsert)
router.post('/update', authenticate, requireAdmin, (req, res) => {
  const { vehicle_id, insurance_expiry, pollution_expiry, tax_status, fitness_expiry, tax_expiry } = req.body;
  const existing = db.prepare('SELECT * FROM compliance WHERE vehicle_id = ?').get(vehicle_id);

  if (existing) {
    db.prepare(
      `UPDATE compliance SET insurance_expiry = ?, pollution_expiry = ?, tax_status = ?, fitness_expiry = ?, tax_expiry = ?
       WHERE vehicle_id = ?`
    ).run(insurance_expiry, pollution_expiry, tax_status, fitness_expiry, tax_expiry, vehicle_id);
  } else {
    db.prepare(
      `INSERT INTO compliance (vehicle_id, insurance_expiry, pollution_expiry, tax_status, fitness_expiry, tax_expiry)
       VALUES (?, ?, ?, ?, ?, ?)`
     ).run(vehicle_id, insurance_expiry, pollution_expiry, tax_status, fitness_expiry, tax_expiry);
  }
  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.user_id, 'UPDATE_COMPLIANCE', `vehicle_id=${vehicle_id}`);
  res.json({ message: 'Compliance record updated' });
});

module.exports = router;
