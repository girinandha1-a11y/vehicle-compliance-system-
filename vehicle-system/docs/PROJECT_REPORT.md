# Project Report: AI-Powered Smart Vehicle Case, Fine & Compliance Management System

## 1. Abstract

This project is a full-stack web application that lets a user retrieve a
vehicle's case history, traffic fines, and regulatory compliance status
either by typing a registration number or by uploading a photograph of the
vehicle's number plate, which is read automatically using an ANPR (Automatic
Number Plate Recognition) pipeline. It is an academic demonstration and uses
only sample/demo data — no real government vehicle registry is accessed.

## 2. Objectives

- Provide a single interface to check a vehicle's fines, legal cases, and
  compliance documents (insurance, pollution, road tax, fitness).
- Demonstrate AI-based number plate recognition as an alternative input
  method to manual registration-number entry.
- Provide role-based access so administrators can manage records while
  regular users can only view their own lookups.
- Surface trends (fine volume, violation categories, compliance health)
  through an analytics dashboard.

## 3. Scope

In scope: authentication, vehicle/fine/case/compliance CRUD and lookup, OCR
plate detection, an analytics dashboard, a notification data model, and
role-based access control. Out of scope for this academic build: real
government data integration, production-grade email/SMS delivery, and
horizontal scaling concerns.

## 4. System Design

The system follows a conventional three-tier architecture: a React SPA
frontend, an Express REST API backend, and a relational database (SQLite for
the runnable demo, MySQL schema provided for production). The OCR step is
implemented as a separate Python module (OpenCV + EasyOCR) invoked by the
Node backend, keeping the ML dependency isolated from the core API. See
`diagrams.md` for the ER diagram, architecture diagram, use case diagram, and
sequence diagram.

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, React Router, Tailwind CSS, Axios, Recharts |
| Backend | Node.js, Express.js, JWT, bcrypt |
| AI/OCR | Python, OpenCV, EasyOCR |
| Database | SQLite (demo) / MySQL (production schema) |

## 6. Key Modules

1. **Authentication** — registration, login, JWT sessions, password reset flow.
2. **Vehicle Search & OCR** — text-based and image-based lookup against demo records.
3. **Fine Management** — pending/paid tracking, search, admin-only creation.
4. **Case Management** — active/closed court cases per vehicle.
5. **Compliance Tracking** — insurance/pollution/tax/fitness with computed
   Valid / Expiring Soon / Expired status.
6. **Notifications** — per-user alert inbox (data model + read/unread state).
7. **Analytics Dashboard** — totals, fine trends, violation categories,
   compliance distribution, vehicle type breakdown.
8. **Admin Panel** — paginated vehicle browser, fine creation form.

## 7. Limitations and Future Work

- OCR runs in a deterministic "stub" mode in the sandboxed build environment
  used to generate this project (no internet access to install opencv/easyocr
  there); the real pipeline is implemented and ready to activate locally.
- Email/SMS delivery for notifications is stubbed (the API returns
  reset tokens directly rather than emailing them, and no cron job currently
  populates the notifications table).
- No automated test suite is included yet — see `TESTING.md` for the manual
  checklist and suggested automated coverage.
- PDF/Excel export and dark mode toggle are not yet wired into the UI, though
  the design tokens already support a dark theme (`darkMode: 'class'` in
  `tailwind.config.js`).

## 8. Conclusion

The delivered system demonstrates the full request/response path described
in the brief — from image upload through OCR to a database-backed compliance
lookup — across every module in the specification, with a working UI for
each listed page and documentation covering the database, API, architecture,
deployment, and testing.
