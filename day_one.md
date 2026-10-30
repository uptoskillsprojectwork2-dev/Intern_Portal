# Day 1 Backend Schema & Workflow Fix Report

## Date
2026-10-09

## Objective
Fix the core data-model and workflow gaps that affect request tracking, analytics, and safe request numbering in the internship portal.

---

## 1) Forward tracking for team-leader reviews

### Change made
Added fields to the certificate request schema:

- `forwardedBy` — ObjectId reference to the user who forwarded the request
- `forwardedAt` — timestamp when the request was forwarded

### Files updated
- `backend/src/models/CertificateRequest.js`

### Why this matters
Without this data, the system cannot measure:
- time spent with a team leader
- requests stuck in review
- TL review activity for analytics and reporting

### Implementation note
When a team leader forwards a request in the review action, the controller sets:
- `request.forwardedBy = req.user.id`
- `request.forwardedAt = new Date()`

---

## 2) Safe request-number generation

### Problem fixed
The earlier approach used `countDocuments() + 1`, which can create duplicate request numbers when multiple requests are created at the same time.

### Solution implemented
Created a dedicated counter collection:

- `backend/src/models/Counter.js`

Counter structure:
- `_id: 'certRequest'`
- `seq: Number`

The request generation logic now uses atomic increment:

- `Counter.findOneAndUpdate({ _id: 'certRequest' }, { $inc: { seq: 1 } }, { new: true, upsert: true })`

This prevents race conditions and guarantees unique request numbers.

### Files updated
- `backend/src/models/Counter.js`
- `backend/src/controllers/intern.controller.js`

### Result format
Request numbers are generated in this format:

- `CERT-2026-00001`

---

## 3) Request indexes for analytics and filtering

### Change made
Added composite indexing to `CertificateRequest` for the fields most important to daily operational analytics and review filtering:

- `status`
- `requestedAt`
- `userId`
- `forwardedBy`

### File updated
- `backend/src/models/CertificateRequest.js`

### Why this matters
These indexes improve search and query speed for:
- pending request queues
- request timelines
- per-user request tracking
- forwarded request monitoring

---

## 4) Role and route consistency check

### Verification completed
Confirmed that the app uses the exact required role strings and route prefix:

- `teamleader` for team leader routes
- `intern` for intern routes
- `admin` for admin routes
- `/api/teamleader` as the TL API prefix

### Verified files
- `backend/src/app.js`
- `backend/src/routes/teamleader.routes.js`
- `backend/src/routes/intern.routes.js`
- `backend/src/routes/admin.routes.js`
- `frontend/src/features/teamleader/services/tl.service.js`

### Result
No mismatch remains between backend route configuration and frontend API calls.

---

## 5) Notes on implementation status

The Day 1 backend changes are complete and aligned with the requested task list:

- Forward tracking for request review flow ✅
- Atomic request number generation ✅
- Request indexes for query performance ✅
- Role and route consistency check ✅

---

## 6) Recommended next step
Continue with the next backend task after validating the request flow in the app, especially:

- TL review action
- request creation flow
- analytics queries that depend on `forwardedBy` and `forwardedAt`
