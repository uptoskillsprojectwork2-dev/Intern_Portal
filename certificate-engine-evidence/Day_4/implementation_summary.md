# Day 4 Implementation Summary — PDF Finalization & Email Delivery

## Milestone Objective
Transform approved certificate drafts into immutable PDF documents using headless browser rendering, persist them to secure local storage, transition certificate lifecycle status, and dispatch them via email attachment to interns.

## Core Architectural Components

### 1. Puppeteer Headless PDF Engine (`backend/src/services/certificate.service.js`)
- `generateCertificatePdf(certificateId)`:
  - Validates certificate document and checks for populated `htmlContent`.
  - Launches headless Chromium instance via Puppeteer with sandbox configuration (`--no-sandbox`, `--disable-setuid-sandbox`).
  - Sets viewport (`1920x1080`) and injects HTML with `networkidle0` wait condition for external fonts and styles.
  - Renders pixel-perfect A4 PDF with `printBackground: true`.
  - Ensures destination directory `uploads/certificates/` exists.
  - Saves file with sanitized naming format: `${certificateNumber}_${Date.now()}.pdf`.
  - Updates `Certificate` document: `pdfPath`, `status = 'issued'`, `issuedDate = new Date()`.

### 2. Finalization & Dispatch Service
- `finalizeAndSendCertificate(requestId, adminId)`:
  - Fetches associated request and draft certificate.
  - Verifies certificate is in editable `'draft'` status.
  - Generates final PDF via `generateCertificatePdf`.
  - Calls `sendEmail` with recipient email, congratulatory notification, and PDF attachment.
  - **Resilient Multi-Status Handling**: If PDF generation succeeds but email dispatch fails (e.g. SMTP timeout/credential issue), returns status `207 Multi-Status` with detailed diagnostics rather than failing the transaction.
  - Updates `CertificateRequest` status to `'completed'`.

### 3. Finalization UI & Feedback Components
- `CertificateReviewPage.jsx`: Added "Finalize & Send Certificate" button with confirmation modal and loading spinner.
- `Toast.jsx`: Lightweight shared toast alert system for real-time success/warning feedback.
- `useCertificateDraft.js`: State management hook handling draft loading, dirty-state tracking, saving, and finalization API calls.
