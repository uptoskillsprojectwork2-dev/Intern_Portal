# UPTOSKILL – Internship Management Portal
## MERN Stack Architecture & Development Documentation

---

## Quick Start

This repository contains a React/Vite frontend and an Express/Node.js backend. MongoDB is required by the backend.

### Prerequisites

- Node.js 20 or newer and npm
- MongoDB running locally or a MongoDB Atlas connection string
- Git

Check the installed versions:

```bash
node --version
npm --version
```

### 1. Clone the repository

```bash
git clone <your-github-repository-url>
cd Intern_Portal
```

### 2. Configure the backend

Create `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/uptoskill
JWT_SECRET=replace-this-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
```

For MongoDB Atlas, replace `MONGO_URI` with the Atlas connection string and make sure the database user and network access rules allow your machine to connect. Do not commit `.env` or any secret values to GitHub.

Install backend dependencies:

```bash
cd backend
npm install
```

### 3. Configure and install the frontend

Open a second terminal from the repository root and run:

```bash
cd frontend
npm install
```

The current frontend authentication service uses `http://localhost:3000` as its backend URL. Keep the backend on port `3000` for local development unless the frontend service is updated as well.

### 4. Start the application

Run the backend in the first terminal:

```bash
cd backend
npm run dev
```

Run the frontend in the second terminal:

```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal, normally [http://localhost:5173](http://localhost:5173). The backend listens on [http://localhost:3000](http://localhost:3000).

The backend should log `MongoDB connected successfully` before authentication requests are made. Stop either development server with `Ctrl+C`.

### 5. Import intern accounts (optional)

To import interns from an Excel workbook, place the file at `backend/data/interns.xlsx`. The importer expects these column names:

| Column | Required |
|---|---|
| `Full Name` | Yes |
| `Email ID` | Yes |
| `Intern Code` | Yes |
| `Mobile No.` | No |
| `Domain` | No |
| `Start Date` | No |
| `End Date` | No |

Then run:

```bash
cd backend
node scripts/importInterns.js
```

Imported accounts use the intern code as the initial password. Change that behavior before production use and never publish the workbook because it contains personal information.

### Useful commands

From `frontend/`:

```bash
npm run lint       # Check frontend code
npm run build      # Create a production build
npm run preview    # Preview the production build locally
```

From `backend/`:

```bash
npm run dev        # Start the backend with nodemon
```

The backend currently has no automated test script. The frontend lint and build commands are the minimum local verification checks.

### Troubleshooting

- **`Mongo URI is not defined in env`**: create `backend/.env` and define `MONGO_URI`.
- **MongoDB connection failed**: verify MongoDB is running, the Atlas URI is correct, and your IP is allowed in Atlas network access.
- **CORS or login request errors**: run the frontend on port `5173`, keep the backend on port `3000`, and check `FRONTEND_URL`.
- **Port already in use**: stop the process using port `3000` or `5173`, then restart the relevant app.
- **Login does not work after import**: use the imported email and matching intern code as the initial password.

### Current implementation status

The current working implementation includes the React/Vite application, Express API, MongoDB connection, cookie-based authentication flow, role-aware routes, login screen, and dashboard scaffolding. The architecture and feature sections below describe the planned full portal, including certificate workflows, AI services, PDF generation, notifications, and retention jobs; those modules still need to be implemented before production deployment.

---

## 1. Project Objective

UPTOSKILL is a centralized web-based Internship Management Portal that automates the complete internship certificate lifecycle — request, review, generation, and download — removing the need for manual email-based coordination between interns and HR. It is built on the **MERN stack** (MongoDB, Express.js, React.js, Node.js) with AI-powered certificate generation, validation, and support.

---

## 2. Technology Stack (MERN)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | **React.js** (with Vite) | Component-based UI, role-based dashboards |
| Backend | **Node.js + Express.js** | REST API server |
| Database | **MongoDB** (Mongoose ODM) | Document-based storage, flexible schema for logs/records |
| Authentication | **JWT** (jsonwebtoken) + **bcrypt.js** | Secure login, RBAC via middleware |
| AI Layer | **Node.js AI service** (OpenAI API / LangChain.js) or Python microservice via REST | Chatbot, validation, duplicate detection, **certificate content generation** |
| PDF Generation | **Puppeteer** (HTML→PDF) | Renders AI-generated content into the final certificate PDF |
| File Storage | **Multer** (local) or **AWS S3 / Cloudinary** (cloud) | Certificate & document storage |
| Task Scheduling | **node-cron** / **Agenda.js** | Automated data retention & cleanup |
| API Communication | REST APIs (Axios on frontend) | |
| Real-time (optional) | **Socket.io** | Live status updates, notifications |
| Deployment | **Docker**, **Nginx**, **Render / Vercel / AWS / VPS** | Frontend (Vercel), Backend (Render/AWS), DB (MongoDB Atlas) |

---

## 3. System Architecture (MERN)

```
┌────────────┐      ┌─────────────────────┐      ┌──────────────────────┐
│   CLIENT    │      │   EXPRESS API        │      │   MONGODB ATLAS       │
│  React.js   │◄────►│  (Node.js Server)     │◄────►│  Collections:          │
│  - Intern   │ REST │  - Auth Middleware    │      │  users, interns,       │
│  - HR       │ JSON │  - RBAC Middleware    │      │  certificateRequests,  │
│  - Admin    │      │  - Route Controllers  │      │  certificates,         │
└────────────┘      │  - Validation Layer   │      │  templates, auditLogs, │
                      │  - AI Service Layer   │      │  notifications,        │
                      │  - PDF Generator      │      │  aiLogs, archives      │
                      │  - Cron Scheduler     │      └──────────────────────┘
                      └─────────┬───────────┘
                                │
                      ┌─────────▼───────────┐
                      │  File Storage        │
                      │  (Local / S3 /       │
                      │   Cloudinary)        │
                      └─────────────────────┘
```

**Request flow:** React client → Axios → Express route → JWT auth middleware → RBAC middleware → controller → Mongoose model → MongoDB → response → React updates UI.

---

## 4. Folder Structure (Recommended)

```
uptoskill/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── intern/
│   │   │   ├── hr/
│   │   │   └── admin/
│   │   ├── context/             # Auth context
│   │   ├── services/            # Axios API calls
│   │   ├── hooks/
│   │   └── App.jsx
│   └── package.json
│
├── server/                     # Node/Express backend
│   ├── config/                 # DB connection, env config
│   ├── models/                 # Mongoose schemas
│   ├── routes/
│   ├── controllers/
│   ├── middleware/             # auth.js, rbac.js, errorHandler.js
│   ├── services/                # aiService.js, pdfService.js, cleanupService.js
│   ├── jobs/                    # node-cron jobs
│   ├── utils/
│   └── server.js
│
└── docker-compose.yml
```

---

## 5. Database Schema (MongoDB Collections)

| Collection | Key Fields |
|---|---|
| `users` | name, email, passwordHash, role (intern/hr/admin), internCode, status |
| `internshipRecords` | userId, department, startDate, endDate, mentor, status |
| `certificateRequests` | internId, certificateType, status (pending/approved/rejected), remarks, requestedAt, reviewedBy |
| `certificates` | requestId, filePath/URL, templateUsed, issuedAt, certificateNumber |
| `certificateTemplates` | name, type, htmlTemplate/layout, createdBy, isActive |
| `notifications` | userId, message, read, createdAt |
| `auditLogs` | actorId, action, targetEntity, timestamp, metadata |
| `aiLogs` | requestId, query/input, aiResponse, action (validation/duplicate-check/chat), timestamp |
| `archivedRecords` | originalCollection, data (snapshot), archivedAt, retentionExpiry |

Relationships use Mongoose `ref` + `.populate()` (e.g., `certificateRequests.internId` references `users`).

---

## 6. Modules & Features

### 6.1 User Authentication
- JWT-based login (`/api/auth/login`) issuing access + refresh tokens
- Passwords hashed with `bcrypt.js`
- `authMiddleware.js` verifies JWT on protected routes
- `rbacMiddleware.js` restricts routes by role: `intern`, `hr`, `admin`
- Separate route groups: `/api/intern/*`, `/api/hr/*`, `/api/admin/*`

### 6.2 Intern Module
- Secure login/logout
- Profile view & update (`GET/PUT /api/intern/profile`)
- Submit certificate request (`POST /api/intern/requests`)
- Track request status (`GET /api/intern/requests`)
- Download approved certificates (`GET /api/intern/certificates/:id/download`)
- View internship info (linked `internshipRecords`)
- AI chatbot widget for guidance (calls `/api/ai/chat`)

### 6.3 HR Module
- Review pending requests (`GET /api/hr/requests?status=pending`)
- Verify internship details against `internshipRecords`
- Approve/reject (`PATCH /api/hr/requests/:id`)
- Add remarks field on each request
- Trigger certificate generation on approval
- Manage certificate templates (`/api/hr/templates`)

### 6.4 Admin Module
- Create intern accounts (`POST /api/admin/users`)
- Manage all users (activate/deactivate, edit roles)
- Configure certificate templates (upload/edit HTML/PDF layout)
- Analytics dashboard (aggregation queries: requests per month, approval rate, avg turnaround time — via MongoDB Aggregation Pipeline)
- View audit logs (`GET /api/admin/audit-logs`)
- Full system management (retention policy config, user roles, template control)

### 6.5 AI Module
Implemented as a dedicated service layer (`services/aiService.js`), can call an LLM API (e.g., OpenAI) or a lightweight Python microservice over REST:
- **Chatbot** — answers intern FAQs (`POST /api/ai/chat`)
- **Data validation** — checks submitted request fields for completeness/consistency before HR review
- **Duplicate detection** — compares new requests against existing ones (hash/fuzzy match on internId + certificateType + date range)
- **HR request prioritization** — scores/sorts pending requests (e.g., by wait time, urgency flags)
- **Smart recommendations** — suggests next certificate type an intern is eligible for
- **Certificate content generation** — takes structured JSON (intern + request data) and produces the certificate's wording (see Section 6.6) — this is the core new AI-driven flow
- All AI interactions logged to `aiLogs` collection for auditability, including every certificate-generation prompt/response pair

### 6.6 Certificate Management (AI-Generated)
Supported types (stored as an enum in `certificateRequests.certificateType`):
1. Offer Letter
2. Bonafide Certificate
3. On-the-Job Training Certificate
4. Experience Letter
5. Internship Completion Certificate
6. Intern of the Month Certificate
7. League Winner Certificate
8. Extensible for future types (prompt-driven, no schema change needed)

**Generation flow (AI-fed, JSON in → certificate out):**

1. On HR approval, the backend assembles a structured JSON payload from `internshipRecords` + `certificateRequests`:
   ```json
   {
     "certificateType": "Experience Letter",
     "internName": "Aditi Sharma",
     "internCode": "UPT2026-045",
     "department": "Software Engineering",
     "startDate": "2026-01-05",
     "endDate": "2026-07-05",
     "mentor": "Rohan Verma",
     "achievements": ["Led onboarding module", "Completed 3 sprints"]
   }
   ```
2. `aiService.generateCertificateContent(payload)` sends this JSON + a type-specific system prompt to the LLM, requesting **structured output only** (JSON in, JSON out) — e.g. `{ title, bodyParagraphs[], closingLine, signatureBlock }`. Structured output (not free text) makes the next validation step reliable.
3. `validationService.js` cross-checks every factual field in the AI response (name, dates, code, department) against the original JSON. Any mismatch or hallucinated value → request is auto-flagged and routed back to HR instead of silently issuing a wrong certificate.
4. `pdfService.js` takes the **validated** AI content and injects it into a fixed HTML/CSS layout (letterhead, logo, formatting stay static — only the wording is AI-generated) → renders to PDF via **Puppeteer**.
5. PDF is saved to storage; a `certificates` record is created; the full AI prompt/response pair is logged to `aiLogs` for audit traceability; intern is notified.

This keeps layout/branding consistent and machine-verifiable while letting AI handle the variable wording (tone, phrasing, achievement narrative) per certificate type — instead of maintaining a rigid static template per type.

### 6.7 Download Centre
- List all generated certificates (`GET /api/intern/certificates`)
- Secure download endpoint (signed URL or auth-protected stream)
- Request history with filters (type, date, status)
- Status tracking (pending/approved/rejected/generated)

### 6.8 Database Management Module
All eight data domains map directly to MongoDB collections listed in Section 5 — Users, Internship Records, Certificate Requests, Generated Certificates, Certificate Templates, Notifications, Audit Logs, AI Logs, Archived Records.

### 6.9 Data Retention & Cleanup Module
- **node-cron** job (e.g., `jobs/cleanupJob.js`) runs on a configurable schedule (daily/weekly)
- Reads retention policy from an `admin`-configurable settings document
- Finds records older than retention threshold
- Archives them into `archivedRecords` (snapshot + metadata) before deletion
- Deletes expired records and associated PDF files from storage
- Writes an entry to `auditLogs` for every cleanup run (what was archived/deleted, when, by which job run)
- Optimizes DB size via TTL indexes (MongoDB native `expireAfterSeconds`) as an additional/alternate mechanism for notifications and logs

---

## 7. System Workflow

1. User logs in → Express issues JWT → stored client-side (httpOnly cookie recommended)
2. Intern updates profile if required (`PUT /api/intern/profile`)
3. Intern selects certificate type and submits a request
4. AI service validates submitted data + checks duplicates
5. Request appears in HR queue (sorted/prioritized by AI service)
6. HR reviews, verifies against internship records, approves/rejects with remarks
7. On approval, backend auto-generates the certificate PDF
8. Certificate stored in file storage; record saved in `certificates` collection
9. Intern is notified, tracks status, downloads the approved certificate
10. Cleanup cron job periodically archives/deletes expired records per retention policy

---

## 8. Step-by-Step Development Process

### Phase 1 — Planning & Setup
1. Finalize requirements per module (use Section 6 as the checklist)
2. Set up Git repo with `client/` and `server/` folders (monorepo or two repos)
3. Set up MongoDB Atlas cluster (or local MongoDB via Docker)
4. Initialize Node/Express backend: `npm init`, install `express`, `mongoose`, `dotenv`, `cors`, `bcryptjs`, `jsonwebtoken`
5. Initialize React frontend: `npm create vite@latest client -- --template react`, install `axios`, `react-router-dom`

### Phase 2 — Authentication & RBAC
6. Build `User` Mongoose model with role enum
7. Build `/api/auth/register` (admin-only, creates intern/HR accounts) and `/api/auth/login`
8. Implement JWT signing/verification and refresh token flow
9. Build `authMiddleware` and `rbacMiddleware`
10. Build React `AuthContext` + protected route wrapper per role

### Phase 3 — Core Data Models
11. Create Mongoose schemas: `InternshipRecord`, `CertificateRequest`, `Certificate`, `CertificateTemplate`, `Notification`, `AuditLog`, `AiLog`, `ArchivedRecord`
12. Add indexes (e.g., on `internId`, `status`, `createdAt`) for query performance

### Phase 4 — Intern Module
13. Build profile view/update endpoints + React profile page
14. Build certificate request submission form (dynamic based on certificate type)
15. Build "My Requests" page with real-time status (poll or Socket.io)
16. Build Download Centre page

### Phase 5 — HR Module
17. Build HR request queue view with filters (status, type, date)
18. Build approve/reject endpoints with remarks field
19. Build template management UI (upload/edit certificate templates)

### Phase 6 — Admin Module
20. Build user management (create/edit/deactivate intern & HR accounts)
21. Build analytics dashboard using MongoDB aggregation pipelines (charts via Chart.js/Recharts)
22. Build audit log viewer with filters
23. Build retention policy configuration UI

### Phase 7 — AI Module
24. Stand up `aiService.js` — integrate an LLM API or self-hosted model for chatbot
25. Implement validation logic (required-field checks, format checks, cross-reference with `internshipRecords`)
26. Implement duplicate detection (query existing requests by intern + type + overlapping timeframe)
27. Implement prioritization scoring for HR queue
28. Log every AI interaction to `aiLogs`

### Phase 8 — AI-Driven Certificate Generation
29. Design **one fixed HTML/CSS layout shell** per certificate type (letterhead, logo, formatting) — this stays static, only the text content is AI-generated
30. Define a strict **JSON schema** for AI input (intern data) and AI output (title, bodyParagraphs, closingLine, signatureBlock) per certificate type
31. Write type-specific system prompts (`prompts/experienceLetter.js`, etc.) instructing the LLM to return structured JSON only — no free text, no markdown
32. Build `aiService.generateCertificateContent(payload)` to call the LLM API with the JSON payload + prompt
33. Build `validationService.js` to cross-check every factual field in the AI output against the source JSON (name, dates, code, department) — reject/flag on mismatch
34. Build `pdfService.js` using Puppeteer to inject validated AI content into the static HTML shell and render to PDF
35. Wire the full chain (assemble JSON → AI generate → validate → render) into the HR approval endpoint
36. Store generated files (local `/uploads` with Multer, or S3/Cloudinary), save `certificates` metadata, and log the AI prompt/response pair to `aiLogs`

### Phase 9 — Data Retention & Cleanup
37. Build admin-configurable retention policy schema
38. Build `cleanupJob.js` with `node-cron`, scheduled per policy
39. Implement archive-then-delete logic + file cleanup
40. Log every cleanup run to `auditLogs`

### Phase 10 — Testing
41. Unit test controllers/services (Jest + Supertest)
42. Test RBAC boundaries (ensure interns can't access HR/admin routes)
43. Test AI output validation logic with intentionally corrupted/mismatched sample data (ensure bad output is caught, not rendered)
44. Test PDF generation output and file integrity
45. Test cron job on a shortened interval in staging

### Phase 11 — Deployment
46. Dockerize backend and frontend (`Dockerfile` for each) + `docker-compose.yml` for local orchestration
47. Configure Nginx as reverse proxy (routes `/api` to Express, serves React build)
48. Deploy backend to Render/AWS/VPS, frontend to Vercel, database on MongoDB Atlas
49. Set environment variables (JWT secret, DB URI, AI API keys, storage credentials) via each platform's secrets manager
50. Set up CI/CD (GitHub Actions) for automated build/test/deploy on push

---

## 9. Key Features Checklist

- [x] Secure JWT-based Login & Role-Based Access Control (RBAC)
- [x] Centralized Internship Management Portal
- [x] Profile Management for Interns
- [x] AI-Powered Chatbot for User Assistance
- [x] AI-Based Data Validation & Duplicate Detection
- [x] Online Certificate Request & Approval System
- [x] Automated PDF Certificate Generation
- [x] Multiple Certificate Types Support (8 types, extensible)
- [x] Real-Time Request Status Tracking
- [x] Secure Certificate Download Centre
- [x] HR & Admin Dashboard with User Management
- [x] Certificate Template Management
- [x] Audit Logs for System Activity Tracking
- [x] Automatic Data Retention & Cleanup
- [x] Scalable, Cloud-Ready Architecture (Docker + Atlas + Vercel/Render)

---

## 10. MongoDB Design Notes

A few practices to keep in mind for this schema:
- **Relations** (e.g., a request belonging to an intern) use `ObjectId` references + `.populate()`.
- **Audit logs / AI logs** are a natural fit for MongoDB's flexible schema since log shapes vary by action type.
- **Analytics** (admin dashboard) use the **Aggregation Framework** (`$match`, `$group`, `$sort`).
- **Data retention** can be partly automated with MongoDB **TTL indexes** in addition to the cron-based archival job, giving you both automatic expiry and an auditable archive step.

## 11. AI Certificate Generation — Design Principles

Since certificates are official documents, keep these guardrails non-negotiable:
- **Structured in, structured out.** Never let the AI return free-form text that gets dropped straight into a PDF — always request a fixed JSON shape (`title`, `bodyParagraphs`, `closingLine`, `signatureBlock`) so it can be programmatically validated.
- **Static shell, dynamic wording.** Logo, letterhead, signatures, borders, and layout stay in a fixed HTML/CSS template. Only the *text content* is AI-generated. This keeps every certificate visually consistent and prevents the AI from altering official formatting.
- **Validate before render.** Every factual field the AI outputs (names, dates, codes, department) must be checked against the original JSON payload it was given. Mismatches get flagged to HR, never silently rendered.
- **Log everything.** Store the exact JSON input, the prompt version used, and the AI's raw output in `aiLogs` for every certificate — this is your audit trail if a certificate is ever disputed.
- **Deterministic settings.** Use a low temperature (e.g., 0–0.3) for the LLM call so wording stays consistent and predictable across similar requests, rather than creative/variable.
