const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { extractPlate } = require('../ocr/ocrService');
const { generateVehicleDemoData, normalizeVehicleNumber, isValidVehicleNumber } = require('../services/vehicleDemoData');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

function computeComplianceStatus(compliance) {
  if (!compliance) return 'Unknown';
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);
  const dates = [compliance.insurance_expiry, compliance.pollution_expiry, compliance.fitness_expiry, compliance.tax_expiry]
    .filter(Boolean)
    .map((d) => String(d).slice(0, 10));
  if (compliance.tax_status === 'Unpaid') return 'Expired';
  if (dates.some((d) => d < todayString)) return 'Expired';
  const soon = new Date(`${todayString}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 30);
  if (dates.some((d) => d < soon.toISOString().slice(0, 10))) return 'Expiring Soon';
  return 'Valid';
}

function lookupVehicleDashboard(value) {
  const registrationNumber = normalizeVehicleNumber(value);
  if (!isValidVehicleNumber(registrationNumber)) return { error: 'Please enter a valid vehicle registration number.' };
  const storedVehicle = db
    .prepare('SELECT * FROM vehicles WHERE registration_number = ?')
    .get(registrationNumber);

  if (!storedVehicle) {
    const cache = db.collection('demo_vehicle_data');
    const cached = cache.find((item) => item.registration_number === registrationNumber);
    if (cached) return cached.payload;
    const payload = generateVehicleDemoData(registrationNumber);
    cache.push({ registration_number: registrationNumber, payload, created_at: new Date().toISOString() });
    db.save();
    return payload;
  }

  const compliance = db.prepare('SELECT * FROM compliance WHERE vehicle_id = ?').get(storedVehicle.vehicle_id) || {};
  const fines = db.prepare('SELECT * FROM fines WHERE vehicle_id = ?').all(storedVehicle.vehicle_id);
  const cases = db.prepare('SELECT * FROM cases WHERE vehicle_id = ?').all(storedVehicle.vehicle_id);
  const payments = db.collection('payments').filter((payment) => fines.some((fine) => String(fine.fine_id) === String(payment.fine_id)));
  const payload = generateVehicleDemoData(registrationNumber, { vehicle: storedVehicle, compliance, fines, cases, payments });
  return {
    ...payload,
    vehicle: {
      ...payload.vehicle,
      vehicle_id: storedVehicle.vehicle_id,
      compliance_status: computeComplianceStatus(compliance),
    },
    demoData: false,
    demoLabel: 'Stored application record. This platform does not query official government or RTO data.',
  };
}

// GET /api/vehicle/:number
router.get('/:number', authenticate, (req, res) => {
  const result = lookupVehicleDashboard(req.params.number);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ ...result.vehicle, compliance_status: result.vehicle.compliance_status || result.compliance.insurance_status });
});

// POST /api/vehicle/upload  (multipart/form-data, field name: "image")
router.post('/upload', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image file is required' });

  try {
    const result = await extractPlate(req.file.path);
    if (!result.plate) {
      return res.status(422).json({ error: 'Could not detect a number plate in the image' });
    }

    const dashboard = lookupVehicleDashboard(result.plate);
    if (dashboard.error) return res.status(422).json({ error: dashboard.error, detected_plate: result.plate });

    res.json({
      detected_plate: result.plate,
      confidence: result.confidence,
      ocr_mode: result.mode,
      vehicle: dashboard.vehicle,
      demoData: dashboard.demoData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OCR processing failed', details: err.message });
  }
});

// GET /api/vehicles  (list + pagination + search filter, for admin/dashboard)
router.get('/', authenticate, (req, res) => {
  const registrationNumber = req.query.registration_number || req.query.plate || req.query.regNumber;
  if (registrationNumber) {
    const result = lookupVehicleDashboard(registrationNumber);
    if (result.error) return res.status(400).json({ error: result.error });
    return res.json(result);
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const q = req.query.q ? `%${req.query.q}%` : '%';

  const rows = db
    .prepare(
      `SELECT * FROM vehicles WHERE registration_number LIKE ? OR owner_name LIKE ?
       ORDER BY vehicle_id DESC LIMIT ? OFFSET ?`
    )
    .all(q, q, limit, offset);
  const total = db
    .prepare('SELECT COUNT(*) AS c FROM vehicles WHERE registration_number LIKE ? OR owner_name LIKE ?')
    .get(q, q).c;

  res.json({ data: rows, page, limit, total });
});

module.exports = router;
