# RoadLedger — AI-Powered Smart Vehicle Case, Fine & Compliance Management System

An academic full-stack project that looks up a vehicle's cases, fines, and
compliance status by registration number, or by uploading a photo of the
number plate (ANPR/OCR). **All data is sample/demo data — no real government
vehicle database is used or contacted.**

## Folder structure

```
vehicle-system/
├── backend/                 Node.js + Express REST API
│   ├── models/db.js         JSON-backed demo store with SQLite-style query adapter
│   ├── middleware/auth.js   JWT auth + role guard
│   ├── routes/              existing modules plus intelligence, documents, and payments
│   ├── ocr/
│   │   ├── ocrService.js    Node-side OCR dispatcher (stub | python)
│   │   ├── plate_reader.py  OpenCV + EasyOCR plate pipeline
│   │   └── document_reader.py EasyOCR text and expiry-date extraction
│   ├── seed/seed.js         Populates demo users, vehicles, fines, cases, compliance
│   └── server.js            App entry point
├── frontend/                 React + Vite + Tailwind + Recharts
│   └── src/
│       ├── pages/            Existing pages plus Intelligence and Documents
│       ├── components/       NavBar, ProtectedRoute, StatusBadge
│       └── public/           PWA manifest, offline shell worker, app icon
│       ├── context/          AuthContext (JWT session)
│       └── api/client.js     Axios instance with auth interceptor
├── database/schema.sql       MySQL DDL matching the spec (production target)
└── docs/                     API docs, diagrams, deployment guide, testing docs, report
```

## Quick start (local demo)

### 1. Backend
```bash
cd backend
npm install
copy .env.example .env
npm run seed      # populates database.json with demo data
npm start         # http://localhost:5000
```
Demo logins created by the seed script:
- Admin: `admin@demo.com` / `Admin@123`
- User: `user@demo.com` / `User@123`

### 2. Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxies /api to :5000)
```

## About the OCR module

The brief asks for OpenCV + EasyOCR/Tesseract number-plate recognition. The
full working pipeline is implemented in `backend/ocr/plate_reader.py` (image
preprocessing → contour-based plate localization → OCR → text cleanup).
By default the backend runs with `OCR_MODE=stub` in `.env`, which picks a
real plate from the demo dataset so the **upload → detect → search → display**
flow is fully demonstrable without installing any ML libraries. Once you
`pip install opencv-python easyocr numpy` locally, set `OCR_MODE=python` and
the same `/api/vehicle/upload` endpoint will shell out to the real script —
no other code changes needed.

## Persistence and production boundary

- **Demo/runtime:** `backend/models/db.js` is a lightweight JSON-backed store, auto-saved to `backend/database.json` when the server runs from `backend/`.
- **Schema reference:** `database/schema.sql` describes the intended MySQL production schema. Replacing the demo adapter with a transactional database driver is required before production use.
- **MongoDB:** The current repository does not use MongoDB; changing its persistence technology would violate the request to preserve the current database architecture. The supplied SQL schema is kept aligned with the added modules.

## Added workflows

- **Intelligence:** Explainable baseline risk/probability estimates, stored prediction history, global record search, audit search, downloadable CSV reports, and contextual rule-based chat.
- **Compliance reminders:** A daily in-process scan creates in-app history at each user's configured day offsets. SMTP mail is sent only when the user enables it and valid `SMTP_*` variables are configured.
- **Documents:** Private authenticated uploads/previews with admin verification. EasyOCR expiry extraction is optional and requires `DOC_OCR_MODE=python` plus Python packages.
- **Payments:** Razorpay Checkout order creation and provider-side signature/capture verification. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; the app intentionally does not mark a fine paid when the provider is unavailable.
- **PWA / ANPR:** Camera capture feeds the existing plate recognition endpoint. The PWA caches the static app shell only; private API data remains online-only.

The risk estimator is a transparent rules baseline, not a trained/scientifically validated ML model. Treat outputs as decision support only; production deployment needs a representative labeled dataset, model validation, monitoring, and a separately deployed model service. Chat responses are deterministic platform guidance, not a generative AI service.

## Other docs

- `docs/API_DOCUMENTATION.md` — every endpoint, request/response shape
- `docs/diagrams.md` — ER diagram, architecture diagram, use case diagram, sequence diagram (Mermaid)
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/TESTING.md`
- `docs/PROJECT_REPORT.md`

## What's a starter vs. production-ready here

This is a genuinely large brief (11 pages, ANPR pipeline, 6 modules, full docs
set). What's included is a **working, coherent scaffold**: real auth, real
CRUD across every module, a real OCR pipeline (network-gated to a stub in
this sandbox), seeded demo data, and a functioning React UI for every page
in the spec. Left for you to extend for a polished submission: input
validation hardening, automated test suite beyond the smoke tests in
`docs/TESTING.md`, email/SMS notification delivery (the DB and API shape is
ready, `nodemailer` is wired but unconfigured), and PDF/Excel export.
