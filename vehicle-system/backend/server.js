require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const fineRoutes = require('./routes/fines');
const caseRoutes = require('./routes/cases');
const complianceRoutes = require('./routes/compliance');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const intelligenceRoutes = require('./routes/intelligence');
const documentRoutes = require('./routes/documents');
const paymentRoutes = require('./routes/payments');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/vehicle', vehicleRoutes);   // includes /api/vehicle/upload, /api/vehicle/:number
app.use('/api/vehicles', vehicleRoutes);  // list endpoint alias, see routes/vehicles.js
app.use('/api/fines', fineRoutes);
app.use('/api/fine', fineRoutes);         // POST /api/fine/add per spec
app.use('/api/cases', caseRoutes);
app.use('/api/case', caseRoutes);         // POST /api/case/add per spec
app.use('/api/compliance', complianceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
