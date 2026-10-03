const express = require('express');
const nodemailer = require('nodemailer');
const db = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const expiryFields = [
  ['insurance_expiry', 'Insurance'],
  ['pollution_expiry', 'Pollution certificate'],
  ['fitness_expiry', 'Fitness certificate'],
  ['tax_expiry', 'Road tax'],
];
const defaultOffsets = [30, 15, 7, 1];

router.use(authenticate);

function records(name) {
  return db.collection(name);
}

function byVehicle(name, vehicleId) {
  return db.prepare(`SELECT * FROM ${name} WHERE vehicle_id = ?`).all(vehicleId);
}

function isExpired(dateValue) {
  const parts = String(dateValue).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const expiryDay = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  return expiryDay < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function assessVehicle(vehicleId) {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(Number(vehicleId));
  if (!vehicle) return null;
  const fines = byVehicle('fines', vehicleId);
  const cases = byVehicle('cases', vehicleId);
  const compliance = db.prepare('SELECT * FROM compliance WHERE vehicle_id = ?').get(Number(vehicleId));
  const today = new Date();
  const expiredDocuments = compliance
    ? expiryFields.filter(([field]) => compliance[field] && isExpired(compliance[field])).length
    : 0;
  const pendingFines = fines.filter((fine) => fine.status === 'Pending').length;
  const activeCases = cases.filter((item) => item.status === 'Active').length;
  const categoryAdjustment = /truck|commercial|bus/i.test(vehicle.vehicle_type || '') ? 5 : 0;
  const score = Math.min(100,
    Math.min(35, fines.length * 10) + Math.min(24, pendingFines * 8) +
    Math.min(24, activeCases * 12) + Math.min(18, expiredDocuments * 6) + categoryAdjustment
  );
  const probability = Math.min(95,
    8 + Math.min(33, fines.length * 11) + Math.min(24, pendingFines * 8) +
    Math.min(18, activeCases * 9) + Math.min(24, expiredDocuments * 8) + categoryAdjustment
  );
  return {
    vehicle,
    score,
    classification: score < 25 ? 'Safe' : score < 55 ? 'Moderate' : 'High Risk',
    probability,
    risk_level: probability < 30 ? 'Low Risk' : probability < 65 ? 'Medium Risk' : 'High Risk',
    factors: { violations: fines.length, pending_fines: pendingFines, active_cases: activeCases, expired_documents: expiredDocuments, vehicle_category: vehicle.vehicle_type },
  };
}

function logActivity(userId, action, details) {
  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(userId, action, details);
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function sendCsv(res, filename, rows) {
  if (!rows.length) return res.status(404).json({ error: 'No records available for this report' });
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const body = [columns, ...rows.map((row) => columns.map((key) => row[key]))]
    .map((row) => row.map(csvCell).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
}

async function predictFromConfiguredService(assessment) {
  if (!process.env.PREDICTION_SERVICE_URL) {
    return { probability: assessment.probability, model: 'explainable-baseline-v1' };
  }
  try {
    const response = await fetch(process.env.PREDICTION_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: assessment.factors }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`Prediction service returned ${response.status}`);
    const result = await response.json();
    if (!Number.isFinite(result.probability) || result.probability < 0 || result.probability > 100) throw new Error('Prediction service returned an invalid probability');
    return { probability: result.probability, model: String(result.model || 'external-model').slice(0, 100) };
  } catch (error) {
    console.error('Prediction service unavailable; using baseline:', error.message);
    return { probability: assessment.probability, model: 'explainable-baseline-v1-fallback' };
  }
}

router.get('/risk/:vehicleId', (req, res) => {
  const assessment = assessVehicle(req.params.vehicleId);
  if (!assessment) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ vehicle_id: assessment.vehicle.vehicle_id, registration_number: assessment.vehicle.registration_number, risk_score: assessment.score, classification: assessment.classification, factors: assessment.factors });
});

router.post('/predict', async (req, res) => {
  const vehicleId = Number(req.body.vehicle_id);
  if (!Number.isInteger(vehicleId) || vehicleId < 1) return res.status(400).json({ error: 'A valid vehicle_id is required' });
  const assessment = assessVehicle(vehicleId);
  if (!assessment) return res.status(404).json({ error: 'Vehicle not found' });
  const predicted = await predictFromConfiguredService(assessment);
  const prediction = db.createRecord('prediction_history', {
    user_id: req.user.user_id,
    vehicle_id: vehicleId,
    probability: predicted.probability,
    risk_level: predicted.probability < 30 ? 'Low Risk' : predicted.probability < 65 ? 'Medium Risk' : 'High Risk',
    risk_score: assessment.score,
    factors: assessment.factors,
    model: predicted.model,
  });
  res.json({ ...prediction, registration_number: assessment.vehicle.registration_number });
});

router.get('/predictions/:vehicleId/history', (req, res) => {
  const history = records('prediction_history')
    .filter((item) => String(item.vehicle_id) === String(req.params.vehicleId))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);
  res.json(history);
});

router.get('/reminders/settings', (req, res) => {
  const saved = records('reminder_settings').find((item) => String(item.user_id) === String(req.user.user_id));
  res.json(saved || { offsets: defaultOffsets, email_enabled: false });
});

router.put('/reminders/settings', (req, res) => {
  const offsets = req.body.offsets;
  if (!Array.isArray(offsets) || offsets.length > 8 || offsets.some((day) => !Number.isInteger(day) || day < 0 || day > 365)) {
    return res.status(400).json({ error: 'offsets must be an array of whole days from 0 to 365' });
  }
  const settings = records('reminder_settings');
  let saved = settings.find((item) => String(item.user_id) === String(req.user.user_id));
  if (saved) {
    saved.offsets = [...new Set(offsets)].sort((a, b) => b - a);
    saved.email_enabled = Boolean(req.body.email_enabled);
    saved.updated_at = new Date().toISOString();
  } else {
    saved = { user_id: req.user.user_id, offsets: [...new Set(offsets)].sort((a, b) => b - a), email_enabled: Boolean(req.body.email_enabled), updated_at: new Date().toISOString() };
    settings.push(saved);
  }
  db.save();
  res.json(saved);
});

router.get('/reminders/history', (req, res) => {
  const history = records('reminder_history')
    .filter((item) => req.user.role === 'admin' || String(item.user_id) === String(req.user.user_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 200);
  res.json(history);
});

function runReminderChecks() {
  const settings = records('reminder_settings');
  const mailer = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
    : null;
  const today = new Date();
  const notifications = db.collection('notifications');
  let generated = 0;
  for (const compliance of db.prepare('SELECT * FROM compliance').all()) {
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(Number(compliance.vehicle_id));
    if (!vehicle) continue;
    for (const [field, documentName] of expiryFields) {
      if (!compliance[field]) continue;
      const expiryParts = compliance[field].split('-').map(Number);
      const expiryDate = Date.UTC(expiryParts[0], expiryParts[1] - 1, expiryParts[2]);
      const todayDate = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      const daysLeft = Math.round((expiryDate - todayDate) / 86400000);
      for (const user of db.prepare('SELECT user_id FROM users').all()) {
        const userSettings = settings.find((item) => String(item.user_id) === String(user.user_id));
        const offsets = userSettings?.offsets || defaultOffsets;
        if (!offsets.includes(daysLeft)) continue;
        const duplicate = records('reminder_history').some((entry) => entry.user_id === user.user_id && entry.vehicle_id === vehicle.vehicle_id && entry.document === documentName && entry.expiry_date === compliance[field] && entry.days_before === daysLeft);
        if (duplicate) continue;
        const message = `${documentName} for ${vehicle.registration_number} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`;
        const history = db.createRecord('reminder_history', { user_id: user.user_id, vehicle_id: vehicle.vehicle_id, document: documentName, expiry_date: compliance[field], days_before: daysLeft, message, email_status: userSettings?.email_enabled ? (mailer ? 'Queued' : 'Not configured') : 'Disabled' });
        notifications.push({ notification_id: notifications.length + 1, user_id: user.user_id, message, category: daysLeft <= 7 ? 'Critical' : 'Warning', status: 'Unread', created_at: new Date().toISOString() });
        if (mailer && userSettings?.email_enabled) {
          const account = db.prepare('SELECT * FROM users WHERE user_id = ?').get(user.user_id);
          if (account?.email) mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: account.email, subject: 'RoadLedger compliance expiry reminder', text: message })
            .then(() => { history.email_status = 'Sent'; db.save(); })
            .catch((error) => { history.email_status = 'Failed'; history.email_error = error.message.slice(0, 300); db.save(); });
        }
        generated += 1;
      }
    }
  }
  if (generated) db.save();
  return generated;
}

router.post('/reminders/run', requireAdmin, (req, res) => res.json({ generated: runReminderChecks() }));

router.post('/chat', (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 1000);
  if (!message) return res.status(400).json({ error: 'message is required' });
  let conversation = records('conversations').find((item) => String(item.conversation_id) === String(req.body.conversation_id) && String(item.user_id) === String(req.user.user_id));
  if (!conversation) conversation = db.createRecord('conversations', { user_id: req.user.user_id, messages: [] });
  const lower = message.toLowerCase();
  const plate = message.toUpperCase().match(/\b[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}\b/)?.[0];
  let reply;
  if (plate) {
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE registration_number = ?').get(plate);
    if (!vehicle) reply = `I couldn't find ${plate} in the vehicle register. Check the plate and try again.`;
    else {
      const assessment = assessVehicle(vehicle.vehicle_id);
      const pending = byVehicle('fines', vehicle.vehicle_id).filter((fine) => fine.status === 'Pending').length;
      reply = `${plate} is registered as a ${vehicle.vehicle_type}. It has ${pending} pending fine(s) and a ${assessment.classification.toLowerCase()} risk score of ${assessment.score}/100. Use Compliance for document expiry details.`;
    }
  } else if (/fine|payment|pay/.test(lower)) reply = 'Open Fines, search by registration number, and review each fine status. Online payment is only available when a payment provider is configured; never share card details in chat.';
  else if (/case|hearing/.test(lower)) reply = 'Open Cases and search the vehicle registration number to review active or closed cases and any scheduled hearing date.';
  else if (/insurance|pollution|fitness|tax|compliance|expiry/.test(lower)) reply = 'Open Compliance and search the registration number. Expiry status is calculated from the recorded insurance, pollution, fitness, and tax fields.';
  else if (/search|find|vehicle/.test(lower)) reply = 'Use Vehicle Search for registration lookup. You can also include a plate number in this chat and I will check the demo vehicle register.';
  else reply = 'I can help with fine status, traffic cases, compliance expiry, and vehicle lookup. Include a registration number for a record-specific response.';
  conversation.messages.push({ role: 'user', content: message, created_at: new Date().toISOString() });
  conversation.messages.push({ role: 'assistant', content: reply, created_at: new Date().toISOString() });
  conversation.updated_at = new Date().toISOString();
  db.save();
  res.json({ conversation_id: conversation.conversation_id, reply, messages: conversation.messages });
});

router.get('/chat/history', (req, res) => {
  const items = records('conversations').filter((item) => String(item.user_id) === String(req.user.user_id));
  res.json(items);
});

router.get('/search', (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  if (query.length < 2) return res.status(400).json({ error: 'q must contain at least 2 characters' });
  const includes = (value) => String(value || '').toLowerCase().includes(query);
  const results = [
    ...db.prepare('SELECT * FROM vehicles').all().filter((row) => includes(row.registration_number) || includes(row.owner_name)).map((row) => ({ type: 'vehicle', id: row.vehicle_id, label: row.registration_number, detail: row.owner_name })),
    ...db.prepare('SELECT * FROM fines').all().filter((row) => includes(row.fine_id) || includes(row.violation_type)).map((row) => ({ type: 'fine', id: row.fine_id, label: `Fine #${row.fine_id}`, detail: row.violation_type })),
    ...db.prepare('SELECT * FROM cases').all().filter((row) => includes(row.case_id) || includes(row.case_type)).map((row) => ({ type: 'case', id: row.case_id, label: `Case #${row.case_id}`, detail: row.case_type })),
    ...records('documents').filter((row) => includes(row.document_number)).map((row) => ({ type: 'document', id: row.document_id, label: row.document_number, detail: row.document_type })),
  ];
  res.json(results.slice(0, 50));
});

router.get('/audit', requireAdmin, (req, res) => {
  const query = String(req.query.q || '').toLowerCase();
  const logs = db.prepare('SELECT * FROM audit_logs').all()
    .filter((row) => !query || [row.action, row.details, row.user_id].some((value) => String(value || '').toLowerCase().includes(query)))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 500);
  res.json(logs);
});

router.get('/admin-summary', requireAdmin, (req, res) => {
  const vehicles = db.prepare('SELECT * FROM vehicles').all();
  const riskDistribution = { Safe: 0, Moderate: 0, 'High Risk': 0 };
  for (const vehicle of vehicles) riskDistribution[assessVehicle(vehicle.vehicle_id).classification] += 1;
  const payments = records('payments');
  const activity = db.prepare('SELECT * FROM audit_logs').all()
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8);
  res.json({
    total_payments: payments.filter((item) => item.status === 'Paid').length,
    pending_payments: payments.filter((item) => item.status === 'Pending').length,
    risk_distribution: riskDistribution,
    recent_activity: activity,
  });
});

router.get('/reports/:type.csv', requireAdmin, (req, res) => {
  const sources = { vehicles: 'vehicles', fines: 'fines', cases: 'cases', compliance: 'compliance', predictions: 'prediction_history', reminders: 'reminder_history', audit: 'audit_logs' };
  const source = sources[req.params.type];
  if (!source) return res.status(404).json({ error: 'Unknown report type' });
  sendCsv(res, `${source}-report.csv`, db.collection(source));
});

function scheduledReminderCheck() {
  try { runReminderChecks(); } catch (error) { console.error('Compliance reminder scan failed:', error); }
}
setTimeout(scheduledReminderCheck, 1000);
setInterval(scheduledReminderCheck, 24 * 60 * 60 * 1000).unref();

module.exports = router;