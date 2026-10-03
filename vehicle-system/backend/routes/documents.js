const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const db = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads', 'documents');
fs.mkdirSync(uploadDir, { recursive: true });
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
function isExpired(dateValue) {
  return String(dateValue).slice(0, 10) < new Date().toISOString().slice(0, 10);
}
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, done) => done(null, `${Date.now()}-${require('crypto').randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, done) => done(null, allowedTypes.has(file.mimetype)),
});

function extractDocumentData(filePath) {
  if (process.env.DOC_OCR_MODE !== 'python') return Promise.resolve({ extracted_text: '', expiry_date: null, ocr_mode: 'disabled' });
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, '..', 'ocr', 'document_reader.py');
    const python = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
    const processHandle = spawn(python, [script, filePath]);
    let output = '';
    let error = '';
    processHandle.stdout.on('data', (chunk) => { output += chunk.toString(); });
    processHandle.stderr.on('data', (chunk) => { error += chunk.toString(); });
    processHandle.on('close', (code) => {
      if (code !== 0) return reject(new Error(error || 'Document OCR failed'));
      try { resolve(JSON.parse(output)); } catch { reject(new Error('Document OCR returned invalid output')); }
    });
  });
}

router.use(authenticate);

router.get('/:vehicleId', (req, res) => {
  const documents = db.collection('documents').filter((item) => String(item.vehicle_id) === String(req.params.vehicleId));
  res.json(documents.sort((a, b) => b.created_at.localeCompare(a.created_at)));
});

router.post('/upload', upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A JPEG, PNG, WebP, or PDF document (maximum 10 MB) is required' });
  const vehicleId = Number(req.body.vehicle_id);
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicleId);
  if (!vehicle) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  const documentType = String(req.body.document_type || '').trim();
  if (!['Insurance', 'Pollution Certificate', 'Fitness Certificate', 'Registration Certificate', 'Road Tax'].includes(documentType)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Unsupported document_type' });
  }
  try {
    const extracted = req.file.mimetype.startsWith('image/') ? await extractDocumentData(req.file.path) : { extracted_text: '', expiry_date: null, ocr_mode: 'not-supported-for-pdf' };
    const expiryDate = req.body.expiry_date || extracted.expiry_date || null;
    const validExpiry = expiryDate && !Number.isNaN(Date.parse(expiryDate));
    const document = db.createRecord('documents', {
      vehicle_id: vehicleId,
      document_type: documentType,
      document_number: String(req.body.document_number || '').trim().slice(0, 100),
      original_name: path.basename(req.file.originalname).slice(0, 180),
      storage_name: path.basename(req.file.filename),
      mime_type: req.file.mimetype,
      expiry_date: validExpiry ? new Date(expiryDate).toISOString().slice(0, 10) : null,
      extracted_text: String(extracted.extracted_text || '').slice(0, 4000),
      ocr_mode: extracted.ocr_mode,
      verification_status: validExpiry ? (isExpired(expiryDate) ? 'Expired' : 'Verified') : 'Pending review',
      uploaded_by: req.user.user_id,
    });
    db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.user_id, 'DOCUMENT_UPLOAD', `document_id=${document.document_id} vehicle_id=${vehicleId}`);
    res.status(201).json(document);
  } catch (error) {
    fs.unlinkSync(req.file.path);
    res.status(422).json({ error: 'Could not extract document data', details: error.message });
  }
});

router.get('/file/:documentId', (req, res) => {
  const document = db.collection('documents').find((item) => String(item.document_id) === String(req.params.documentId));
  if (!document) return res.status(404).json({ error: 'Document not found' });
  const filePath = path.join(uploadDir, path.basename(document.storage_name));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Stored file not found' });
  res.type(document.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${document.original_name.replace(/["\r\n]/g, '')}"`);
  res.sendFile(filePath);
});

router.put('/:documentId/verify', requireAdmin, (req, res) => {
  const document = db.collection('documents').find((item) => String(item.document_id) === String(req.params.documentId));
  if (!document) return res.status(404).json({ error: 'Document not found' });
  const expiryDate = String(req.body.expiry_date || document.expiry_date || '');
  if (expiryDate && Number.isNaN(Date.parse(expiryDate))) return res.status(400).json({ error: 'expiry_date must be a valid date' });
  document.expiry_date = expiryDate || null;
  document.document_number = String(req.body.document_number || document.document_number || '').trim().slice(0, 100);
  document.verification_status = expiryDate ? (isExpired(expiryDate) ? 'Expired' : 'Verified') : 'Pending review';
  document.verified_by = req.user.user_id;
  document.verified_at = new Date().toISOString();
  db.save();
  db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.user_id, 'DOCUMENT_VERIFIED', `document_id=${document.document_id}`);
  res.json(document);
});

module.exports = router;