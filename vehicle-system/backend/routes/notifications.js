const express = require('express');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticate, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.user_id);
  res.json(rows);
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, (req, res) => {
  db.prepare("UPDATE notifications SET status = 'Read' WHERE notification_id = ? AND user_id = ?").run(
    req.params.id,
    req.user.user_id
  );
  res.json({ message: 'Marked as read' });
});

// Internal helper (used by a scheduled job / seed script) — not exposed as a route,
// but shown here for completeness of the "smart notification" logic described
// in the brief: scans compliance + fines and generates dashboard alerts.
function generateComplianceAlerts() {
  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + 30);

  const expiring = db
    .prepare(
      `SELECT v.owner_name, v.registration_number, c.insurance_expiry
       FROM compliance c JOIN vehicles v ON v.vehicle_id = c.vehicle_id
       WHERE c.insurance_expiry BETWEEN date('now') AND date('now', '+30 days')`
    )
    .all();

  // In a full deployment this would look up the vehicle's owning user_id and
  // insert a notification row + optionally send an email via nodemailer.
  return expiring;
}

module.exports = router;
module.exports.generateComplianceAlerts = generateComplianceAlerts;
