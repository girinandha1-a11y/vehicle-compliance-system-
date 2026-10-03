const express = require('express');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/summary
router.get('/summary', authenticate, (req, res) => {
  const totalVehicles = db.prepare('SELECT COUNT(*) c FROM vehicles').get().c;
  const totalFines = db.prepare('SELECT COUNT(*) c FROM fines').get().c;
  const pendingFinesAmount = db
    .prepare("SELECT COALESCE(SUM(amount),0) s FROM fines WHERE status = 'Pending'")
    .get().s;
  const activeCases = db.prepare("SELECT COUNT(*) c FROM cases WHERE status = 'Active'").get().c;

  const complianceRows = db.prepare('SELECT * FROM compliance').all();
  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + 30);
  let valid = 0, expiringSoon = 0, expired = 0;
  for (const c of complianceRows) {
    const dates = [c.insurance_expiry, c.pollution_expiry, c.fitness_expiry].filter(Boolean).map((d) => new Date(d));
    if (c.tax_status === 'Unpaid' || dates.some((d) => d < today)) expired++;
    else if (dates.some((d) => d < soon)) expiringSoon++;
    else valid++;
  }

  res.json({
    total_vehicles: totalVehicles,
    total_fines: totalFines,
    pending_fines_amount: pendingFinesAmount,
    active_cases: activeCases,
    compliance_distribution: { Valid: valid, 'Expiring Soon': expiringSoon, Expired: expired },
  });
});

// GET /api/analytics/fine-trends  (fines grouped by month)
router.get('/fine-trends', authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', issued_date) AS month, COUNT(*) AS count, SUM(amount) AS total
       FROM fines GROUP BY month ORDER BY month`
    )
    .all();
  res.json(rows);
});

// GET /api/analytics/violation-categories
router.get('/violation-categories', authenticate, (req, res) => {
  const rows = db
    .prepare('SELECT violation_type, COUNT(*) AS count FROM fines GROUP BY violation_type')
    .all();
  res.json(rows);
});

// GET /api/analytics/vehicle-types
router.get('/vehicle-types', authenticate, (req, res) => {
  const rows = db
    .prepare('SELECT vehicle_type, COUNT(*) AS count FROM vehicles GROUP BY vehicle_type')
    .all();
  res.json(rows);
});

module.exports = router;
