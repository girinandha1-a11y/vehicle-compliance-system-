const express = require('express');
const crypto = require('crypto');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function credentials(res) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    res.status(503).json({ error: 'Online payments are not configured. Set Razorpay credentials to enable checkout.' });
    return false;
  }
  return true;
}

function razorpayAuth() {
  return `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
}

router.post('/order', async (req, res) => {
  if (!credentials(res)) return;
  const fineId = Number(req.body.fine_id);
  const fine = db.prepare('SELECT * FROM fines WHERE fine_id = ?').get(fineId);
  if (!fine) return res.status(404).json({ error: 'Fine not found' });
  if (fine.status !== 'Pending') return res.status(409).json({ error: 'Only pending fines can be paid' });
  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: razorpayAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(Number(fine.amount) * 100), currency: 'INR', receipt: `fine_${fineId}_${Date.now()}`, notes: { fine_id: String(fineId), vehicle_id: String(fine.vehicle_id) } }),
    });
    const order = await response.json();
    if (!response.ok) return res.status(502).json({ error: order.error?.description || 'Payment provider could not create an order' });
    const payment = db.createRecord('payments', { fine_id: fineId, user_id: req.user.user_id, order_id: order.id, amount: Number(fine.amount), currency: 'INR', status: 'Pending' });
    res.status(201).json({ payment_id: payment.payment_id, order_id: order.id, amount: order.amount, currency: order.currency, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    res.status(502).json({ error: 'Payment provider is unavailable', details: error.message });
  }
});

router.post('/verify', async (req, res) => {
  if (!credentials(res)) return;
  const { payment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const payment = db.collection('payments').find((item) => String(item.payment_id) === String(payment_id) && String(item.user_id) === String(req.user.user_id));
  if (!payment || payment.order_id !== razorpay_order_id) return res.status(404).json({ error: 'Payment order not found' });
  if (payment.status === 'Paid') return res.json({ status: 'Paid', fine_id: payment.fine_id });
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest();
  let supplied;
  try { supplied = Buffer.from(String(razorpay_signature || ''), 'hex'); } catch { supplied = Buffer.alloc(0); }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    payment.status = 'Failed';
    payment.failure_reason = 'Invalid provider signature';
    db.save();
    return res.status(400).json({ error: 'Payment signature verification failed' });
  }
  try {
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, { headers: { Authorization: razorpayAuth() } });
    const providerPayment = await response.json();
    if (!response.ok || providerPayment.order_id !== razorpay_order_id || providerPayment.status !== 'captured' || providerPayment.amount !== Math.round(payment.amount * 100)) {
      payment.status = 'Failed';
      payment.failure_reason = providerPayment.error?.description || `Payment status: ${providerPayment.status || 'unavailable'}`;
      db.save();
      return res.status(409).json({ error: 'Payment has not been captured by the provider' });
    }
    payment.status = 'Paid';
    payment.provider_payment_id = razorpay_payment_id;
    payment.verified_at = new Date().toISOString();
    db.prepare("UPDATE fines SET status = 'Paid' WHERE fine_id = ?").run(payment.fine_id);
    db.prepare('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)').run(req.user.user_id, 'PAYMENT_VERIFIED', `payment_id=${payment.payment_id} fine_id=${payment.fine_id}`);
    db.save();
    res.json({ status: 'Paid', fine_id: payment.fine_id, payment_id: payment.payment_id });
  } catch (error) {
    res.status(502).json({ error: 'Could not verify payment with provider', details: error.message });
  }
});

router.get('/history/:fineId', (req, res) => {
  const payments = db.collection('payments').filter((item) => String(item.fine_id) === String(req.params.fineId) && (req.user.role === 'admin' || String(item.user_id) === String(req.user.user_id)));
  res.json(payments.sort((a, b) => b.created_at.localeCompare(a.created_at)));
});

module.exports = router;