# Day 3 Implementation Summary — Certificate Draft Review Workflow

## Milestone Objective
Implement an automated draft generation and admin review workflow for the Certificate Engine in Project AKSHAYA.

## Core Architectural Components

### 1. Model Enhancements (`backend/src/models/Certificate.js`)
- Extended `status` enum with `'draft'` (default) and `'finalized'`.
- Added `htmlContent: { type: String }` to persist draft HTML edits.
- Made `internshipId` optional and made pre-save validation conditional, accommodating intern accounts with embedded `internshipDetails`.

### 2. Certificate Draft Service (`backend/src/services/certificateDraft.service.js`)
- `generateDraftForRequest(requestId, adminId)`:
  - Validates request existence.
  - **Duplicate Protection**: If request already points to a `certificateId`, retrieves existing draft without generating duplicates.
  - Extracts intern information (`fullName`, `email`, `internCode`, `domain`, `startDate`, `endDate`).
  - Retrieves active `CertificateTemplate` matching `certificateType`. Throws controlled 404 if missing.
  - Populates Handlebars template placeholders: `{{InternName}}`, `{{CertificateNumber}}`, `{{Department}}`, `{{StartDate}}`, `{{EndDate}}`, `{{IssueDate}}`, `{{InternCode}}`, `{{CertificateType}}`, `{{VerificationCode}}`.
  - Creates draft certificate document (`status: 'draft'`, `htmlContent: compiledHtml`).
  - Updates request status to `'approved'`, links `certificateId`, sets reviewer timestamp.
- `getDraftCertificate(certificateId)`: Validates ID and retrieves draft.
- `updateDraftHtml(certificateId, htmlContent)`: Validates draft status; strictly prevents modifying finalized certificates.

### 3. Controller & Route Endpoints (`backend/src/controllers/admin.controller.js`, `backend/src/routes/admin.routes.js`)
- Enhanced `finalizeRequest` to trigger draft generation upon request approval.
- Added `GET /api/admin/certificates/draft/:id` to retrieve draft HTML and metadata.
- Added `PUT /api/admin/certificates/draft/:id` to persist modified HTML.
- Guarded endpoints with `verifyAuth` and `requireAdmin`.

### 4. Admin Review Screen (`frontend/src/features/admin/pages/CertificateReviewPage.jsx`)
- Full split-pane workspace:
  - Left pane: Monospace HTML editor with dirty state indicator and save controls.
  - Right pane: Sandboxed live preview `<iframe>` rendering HTML updates in real time.
- Integrated into `App.jsx` under `/admin/certificates/review/:id`.
- Connected to `ForwardedRequestsList.jsx` with direct "Review Draft" action buttons.
