# API Documentation

Base URL: `http://localhost:5000/api`
Auth: send `Authorization: Bearer <token>` for all routes except register/login/forgot-password.

## Authentication

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` | Returns `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` | Returns `{ token, user }` |
| POST | `/auth/forgot-password` | `{ email }` | Returns a demo reset token (would be emailed in production) |
| POST | `/auth/reset-password` | `{ resetToken, newPassword }` | |
| GET | `/auth/profile` | — | Auth required |
| PUT | `/auth/profile` | `{ name }` | Auth required |

## Vehicles

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/vehicle/:number` | Look up by registration number, includes computed `compliance_status` |
| POST | `/vehicle/upload` | multipart/form-data, field `image`. Runs OCR, returns detected plate + matching vehicle |
| GET | `/vehicles?page=&limit=&q=` | Paginated list with search filter (admin/dashboard use) |

## Fines

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/fines/:vehicleId?status=Pending\|Paid` | |
| GET | `/fines?violation=&minAmount=&maxAmount=` | Cross-vehicle fine search |
| POST | `/fine/add` | Admin only. `{ vehicle_id, violation_type, amount, issued_date }` |
| PUT | `/fine/:fineId/pay` | Marks a fine Paid |

## Cases

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/cases/:vehicleId?status=Active\|Closed` | |
| POST | `/case/add` | Admin only. `{ vehicle_id, case_type, description, hearing_date }` |
| PUT | `/case/:caseId/close` | Admin only |

## Compliance

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/compliance/:vehicleId` | Returns per-item status: Valid / Expiring Soon / Expired |
| POST | `/compliance/update` | Admin only, upsert. `{ vehicle_id, insurance_expiry, pollution_expiry, tax_status, fitness_expiry }` |

## Notifications

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/notifications` | Current user's notifications |
| PUT | `/notifications/:id/read` | Marks one as read |

## Analytics

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/analytics/summary` | Totals + compliance distribution |
| GET | `/analytics/fine-trends` | Fines grouped by month |
| GET | `/analytics/violation-categories` | Fine counts by violation type |
| GET | `/analytics/vehicle-types` | Vehicle counts by type |

## Intelligence, risk, reminders, and search

All endpoints below require a JWT. The current prediction implementation is a transparent rules-based baseline, not a trained model. It persists every prediction so historical scores can be graphed; configure a separately validated ML service before using it for operational decisions.

| Method | Endpoint | Body / notes |
|---|---|---|
| GET | `/intelligence/risk/:vehicleId` | Current 0-100 vehicle score, class, and contributing factors |
| POST | `/intelligence/predict` | `{ vehicle_id }`; returns probability, risk class, factors, and saved prediction ID |
| GET | `/intelligence/predictions/:vehicleId/history` | Latest 100 predictions |
| GET | `/intelligence/reminders/settings` | Current user's offsets and email preference |
| PUT | `/intelligence/reminders/settings` | `{ offsets: [30,15,7,1], email_enabled: false }` |
| GET | `/intelligence/reminders/history` | Current user's reminders; admin sees all |
| POST | `/intelligence/reminders/run` | Admin only; run the daily scan immediately |
| POST | `/intelligence/chat` | `{ message, conversation_id? }`; stores user/assistant turns |
| GET | `/intelligence/chat/history` | Current user's conversation history |
| GET | `/intelligence/search?q=` | Plate, owner, fine/case ID, or document number; max 50 results |
| GET | `/intelligence/audit?q=` | Admin only; filtered latest audit entries |
| GET | `/intelligence/reports/:type.csv` | Admin only; `vehicles`, `fines`, `cases`, `compliance`, `predictions`, `reminders`, or `audit` |

## Documents and payments

| Method | Endpoint | Body / notes |
|---|---|---|
| POST | `/documents/upload` | multipart field `document`, plus `vehicle_id`, `document_type`, optional `document_number` and `expiry_date`; 10 MB maximum |
| GET | `/documents/:vehicleId` | Document metadata for a vehicle |
| GET | `/documents/file/:documentId` | Authenticated inline preview; files are not served as public static assets |
| PUT | `/documents/:documentId/verify` | Admin only; `{ expiry_date, document_number }` |
| POST | `/payments/order` | `{ fine_id }`; creates a Razorpay order when credentials are configured |
| POST | `/payments/verify` | `{ payment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }`; verifies signature and provider-captured amount before marking paid |
| GET | `/payments/history/:fineId` | Payment attempts visible to their initiating user or admin |

The assistant currently uses deterministic, context-aware guidance and is not an external generative AI model. Email delivery requires SMTP settings; OCR expiry extraction requires `DOC_OCR_MODE=python` and the EasyOCR dependencies. Payment routes return `503` until both Razorpay credentials are configured.

## Error shape

All errors: `{ "error": "human readable message" }` with an appropriate HTTP status
(400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 422 unprocessable, 500 server).
