# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BiVerify is a web-based compliance verification system that lets organizations track and verify service delivery via QR codes. There is no mobile app — verification happens in-browser (see `html5-qrcode` usage in the client).

The repo has two top-level halves:

- `client/` — Vite + React 19 SPA (the entire user-facing UI).
- `server_python/` — Python/Flask + MongoDB Atlas backend. Entrypoint: `app.py` (calls `create_app()`). DB-only scripts (`setup_db.py`, `db_test.py`) still live alongside; run `setup_db.py` once to create collections + validators + indexes + seed data.

## Commands

### Client (`client/`)
```bash
npm install
npm run dev       # Vite dev server
npm run build     # production build
npm run lint      # eslint .
npm run preview   # preview built bundle
```
There is no test runner configured in the client.

### Server (`server_python/`)
```bash
cd server_python
# create/activate a venv, then:
pip install -r requirements.txt
python db_test.py     # smoke-test the Atlas connection
python setup_db.py    # one-time: create collections + indexes + seed
python app.py         # run Flask dev server on :5000
```

Required env vars in `server_python/.env` (copy `.env.example`):
- `MONGODB_URI` (Atlas SRV string)
- `MONGODB_DB` (defaults to `biverify`)
- `JWT_SECRET` (required — app refuses to start without it; generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`)
- `JWT_TTL_HOURS` (default 12)
- `CORS_ORIGINS` (comma-separated; default `http://localhost:5173`)

## Architecture

### Frontend routing (`client/src/App.jsx`)
All routes are declared in a single `<BrowserRouter>` in `App.jsx`. Routes are grouped by **role**, and the role determines which sidebar wraps the page:

- **Client org** routes: `/overview`, `/network`, `/Bookings`, `/vault`, `/team`, `/audit`, `/settings` — wrapped by `DashboardLayout` which picks `ClientSidebar` vs `ProviderSidebar` based on whether `pathname` starts with `/provider`.
- **Service provider** routes: `/provider/*` — same layout, `ProviderSidebar`.
- **Provider staff** routes: `/provider/jobs`, `/provider/scan` — rendered without the dashboard layout (these are the QR scanning flow under `pages/ScanVerify/`).
- **Client staff** routes: `/compliance`, `/verify-provider`, `/service-orders` — no layout wrapper.
- **Admin**: `/admin-dashboard`.
- `/` → landing, `*` → redirect to `/login`.

Page components live under `client/src/pages/<Role>/` (`ClientSide`, `ProviderSide`, `ClientStaff`, `ProviderStaff`, `AdminDashboard`, `Authentication`, `Landing`, `ScanVerify`). Sidebars in `client/src/components/` are role-specific (`ClientSidebar`, `ProviderSidebar`, `ProviderStaffSidebar`, `ComplianceSidebar`, `AdminSidebar`).

When adding a page, place it under the matching role folder and decide whether it needs `DashboardLayout` (most authenticated org views do) or stands alone (auth, scan, staff verification flows).

### Data model (`server_python/setup_db.py`)
This script is the source of truth for the MongoDB schema until a real ORM/models layer exists. It creates these collections, each with a `$jsonSchema` validator and indexes:

- `organizations` — both client orgs and providers (distinguished by a `type` field).
- `users` — belong to an organization; roles drive UI access (admin / staff / etc.).
- `compliance_documents` — provider-uploaded certifications.
- `service_requests` — client requests to providers.
- `purchase_orders` — confirmed work; the unit a QR code is issued against.
- `scan_jobs` — provider-staff field jobs scanned via QR.
- `document_verifications` — verification events on compliance docs.
- `b2b_connections` — client ↔ provider relationships.
- `audit_logs` — system-wide activity log.

When changing schema: update the validator in `setup_db.py`, drop/recreate the affected collection in dev (the script skips collections that already exist via `CollectionInvalid`), and update any seed data so the UI still has something to render.

### QR verification flow (backend)
The dual-QR workflow is implemented in `services/verification.py` (single source of truth — both routes are thin wrappers). Two scan endpoints:

- `POST /api/scan/site` (provider_staff) — body `{siteToken, requestId}`. Validates: site QR exists/active; booking exists, is assigned to caller, and matches the scanned site; provider has no non-`verified` / expired compliance docs (`services/compliance.py:is_provider_blocked`). On success, upserts a `scan_jobs` row with `status: in_progress` and `startedAt`, and flips the `service_request` to `in_progress`.
- `POST /api/scan/booking` (client_staff / org_admin / compliance_officer) — body `{bookingToken}`. Resolves the PO by `bookingToken`, requires the matching `scan_jobs` row to be `in_progress`, then sets `completedAt` + closes the `service_request`.

Both endpoints return `{error: {code, message}}` on rejection. Failure codes the frontend already maps: `SITE_QR_INVALID`, `BOOKING_QR_INVALID`, `BOOKING_NOT_FOUND`, `NOT_ASSIGNED`, `LOCATION_MISMATCH`, `COMPLIANCE_EXPIRED`, `NOT_STARTED`, `ALREADY_COMPLETED`, `UNAUTHORIZED`, `FORBIDDEN`. Add new failure modes here, not inline in the route handlers.

QR tokens are random URL-safe strings (`qr.py:generate_token`) stored on the doc — *not* JWTs. This keeps them server-revocable (clear `bookingToken` / set `isActive=false`).

### Auth
JWT (HS256) issued by `auth.py:issue_token` and verified by `@require_auth` / `@require_role(*roles)`. Frontend stores token in `localStorage` as `biverify_token` and `client/src/api/client.js` attaches it as `Authorization: Bearer …`. Roles match the `users.role` enum in setup_db.py.
