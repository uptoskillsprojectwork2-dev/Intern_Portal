# Certificate Engine — Implementation Submission

**Author:** Sai Pradheep Reddy ([@saipradheepreddy](https://github.com/saipradheepreddy))  
**Repository:** [uptoskillsprojectwork2-dev/Intern_Portal](https://github.com/uptoskillsprojectwork2-dev/Intern_Portal)  
**Fork:** [saipradheepreddy/Intern_Portal](https://github.com/saipradheepreddy/Intern_Portal)  
**Feature Branch:** `feat/certificate-engine-day3-day4`

---

## Overview

This submission encapsulates the end-to-end implementation and hardening of the **UptoSkills Certificate Engine** across Days 1 through 4:

1. **Day 1 — Foundation & Schemas**
   - Centralized MongoDB/Mongoose schemas for `Certificate`, `CertificateTemplate`, and `CertificateRequest`.
   - Sequential certificate number generation (`UPS-YYYY-XXXX`).

2. **Day 2 — Frontend Shell & Layout**
   - Admin review layout (`CertificateReviewPage.jsx`).
   - Iframe-isolated preview workspace (`CertificatePreview.jsx`).
   - Navigation wiring from forwarded requests to review.

3. **Day 3 — End-to-End Draft Generation & Live Review Workflow**
   - Automatic draft creation on request approval via `createCertificateDraft`.
   - Real Handlebars compilation merging template markup with recipient and request metadata.
   - REST endpoints: `GET /api/admin/certificates/:id` and `PATCH /api/admin/certificates/:id`.
   - Real-time draft editing in frontend with dynamic live preview updates and draft persistence.

4. **Day 4 — PDF Generation & Automated Email Delivery**
   - Server-side headless PDF rendering using Puppeteer (`renderCertificatePdf`).
   - Finalization pipeline:
     - Saves final HTML markup.
     - Generates A4 landscape print-background PDF.
     - Transitions status: `Certificate.status = "finalized"` and `CertificateRequest.status = "completed"`.
     - Automatically delivers certificate PDF to intern's email via Nodemailer attachment support.
   - Frontend "Finalize & Send" integration with loading spinners, confirmation flow, and read-only lock upon finalization.
