# Deployment Guide

## Local demo (fastest path)

```bash
# Backend
cd backend
npm install
copy .env.example .env
npm run seed
npm start          # http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev         # http://localhost:5173
```

## Moving to MySQL (production-style setup)

1. Provision a MySQL 8+ instance.
2. Run `database/schema.sql` against it: `mysql -u root -p < database/schema.sql`
3. Swap `backend/models/db.js` for a MySQL driver (`mysql2`) using the same
   table/column names — the schema was written to be a drop-in match.
4. Update `.env` with MySQL connection details instead of `DB_FILE`.
5. Re-point `seed/seed.js` inserts at the MySQL connection.

## Enabling real OCR

```bash
pip install opencv-python easyocr numpy --break-system-packages
```
Set `OCR_MODE=python` in `backend/.env`. The existing `/api/vehicle/upload`
endpoint will automatically shell out to `backend/ocr/plate_reader.py`.

For document OCR, set `DOC_OCR_MODE=python` and `PYTHON_BIN=python` (Windows)
or `python3` (Linux/macOS). Install `easyocr`, `opencv-python`, and `numpy` in
that interpreter. Image uploads only; PDFs can be uploaded and reviewed but
are not OCR-parsed.

## Payments and email

Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the backend to enable
Razorpay Checkout. Use Razorpay test keys in development. The server validates
the checkout signature and fetches the provider payment to confirm captured
status and amount before updating the fine.

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally
`SMTP_FROM` to enable reminder email. Users must also opt in under Intelligence.
Without SMTP, reminders remain in-app and email status is recorded as not
configured.

## Prediction service integration

`PREDICTION_SERVICE_URL` may point to an HTTP service accepting
`POST { "features": { ... } }` and returning
`{ "probability": 0-100, "model": "model-version" }`. The current app falls
back to its explainable baseline when the service is absent, unavailable, or
returns an invalid probability. Do not deploy the baseline as a validated
traffic-safety model.

## Production deployment (typical setup)

- **Backend:** containerize with Docker, deploy to a VM/container service
  (Render, Railway, EC2, etc.). Set `JWT_SECRET` to a long random value, put
  MySQL credentials in environment variables, run behind a process manager
  (pm2 or systemd).
- **Frontend:** `npm run build` produces static assets in `frontend/dist/`;
  serve via Nginx, Vercel, or Netlify. Point the API base URL at your deployed
  backend (update `vite.config.js` proxy or set an `VITE_API_URL` env var and
  use it in `src/api/client.js`).
- **HTTPS:** terminate TLS at a reverse proxy (Nginx/Caddy) or platform load
  balancer.
- **File uploads:** `backend/uploads/` should be an object store (S3, etc.)
  in production rather than local disk.
- **Notifications:** fill in `SMTP_*` values in `.env` and wire
  `nodemailer` (already a dependency) into `routes/notifications.js`'s
  `generateComplianceAlerts()` to actually send email; schedule it with a
  cron job or `node-cron`.

## Environment variables reference

See `backend/.env.example` for the full list with comments.
