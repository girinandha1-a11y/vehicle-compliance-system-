# Testing Documentation

## Manual smoke test checklist

Run `npm run seed` first, then walk through:

### Authentication
- [ ] Register a new account → redirected to dashboard, token stored
- [ ] Log out, log back in with the same credentials
- [ ] Log in with wrong password → error shown, no token stored
- [ ] `/auth/forgot-password` with a valid email returns a reset token
- [ ] Reset password with that token, then log in with the new password

### Vehicle search
- [ ] Search `KA01AB1234` → returns Ravi Kumar's demo record with compliance status
- [ ] Search an unknown plate → 404 with clear error message

### OCR upload
- [ ] Upload any image with `OCR_MODE=stub` → returns a real demo plate + matching vehicle
- [ ] With `OCR_MODE=python` and dependencies installed, upload a photo of a
      printed plate → verify detected text is reasonably close (OCR accuracy
      depends on image quality; this is expected for a demo-grade pipeline)

### Fines
- [ ] Load fines for `KA01AB1234` → shows 1 pending + 1 paid
- [ ] Filter by Pending / Paid
- [ ] Mark a pending fine as paid → status updates immediately
- [ ] Admin: POST `/api/fine/add` with a non-admin token → 403 Forbidden

### Cases
- [ ] Load cases for `DL03GH8765` → shows an Active accident-dispute case
- [ ] Filter by Active / Closed

### Compliance
- [ ] Check `MH12EF4321` → tax_status Unpaid should show as Expired overall
- [ ] Check a vehicle with all-future dates → shows Valid across the board

### Analytics dashboard
- [ ] All four charts render with seeded data
- [ ] Summary cards match the counts in the seed script

### Access control
- [ ] Non-admin user cannot reach `/admin` route in the frontend (redirected)
- [ ] Non-admin token gets 403 from `/api/fine/add`, `/api/case/add`, `/api/compliance/update`

## Suggested automated test layers (not yet implemented)

- **Backend unit tests** (Jest + supertest): one test file per route module,
  hitting an in-memory SQLite DB seeded per test.
- **Frontend component tests** (Vitest + React Testing Library): form
  validation, protected route redirects, status badge color mapping.
- **OCR pipeline test**: feed `plate_reader.py` a small fixture set of plate
  images with known ground truth, assert exact-match rate above a threshold.
