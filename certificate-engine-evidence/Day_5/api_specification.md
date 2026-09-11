# Day 5 API Specification — Delivery & Oversight

## Endpoints

### 1. Intern Certificate Metadata Retrieval
- **Route**: `GET /api/intern/certificates/request/:requestId`
- **Auth**: Intern (`Bearer <token>`)
- **Security Check**: `request.userId === req.user.id`
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "certificate": {
      "_id": "60d0fe4f5311236168a109cb",
      "certificateNumber": "CERT-2026-0001",
      "status": "issued",
      "issuedDate": "2026-09-12T01:15:00.000Z",
      "verificationCode": "VER-2026-A1B2C3D4"
    }
  }
  ```

### 2. Intern Certificate PDF Download
- **Route**: `GET /api/intern/certificates/request/:requestId/download`
- **Auth**: Intern (`Bearer <token>`)
- **Response**: Binary stream (`application/pdf`) with `Content-Disposition: attachment; filename="CERT-2026-0001.pdf"`

### 3. Admin Centralized Certificate Overview
- **Route**: `GET /api/admin/certificates/overview`
- **Auth**: Admin (`Bearer <token>`)
- **Query Params**: `?status=issued&search=INT-2026&page=1&limit=20`
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "certificates": [
      {
        "_id": "60d0fe4f5311236168a109cb",
        "certificateNumber": "CERT-2026-0001",
        "internCode": "INT-2026-081",
        "internName": "Akshaya Marupaka",
        "status": "issued",
        "issuedDate": "2026-09-12T01:15:00.000Z",
        "pdfPath": "uploads/certificates/CERT-2026-0001_1726084800000.pdf"
      }
    ],
    "pagination": { "total": 1, "page": 1, "pages": 1 }
  }
  ```

### 4. Admin Retry Certificate Generation
- **Route**: `POST /api/admin/certificates/requests/:requestId/retry`
- **Auth**: Admin (`Bearer <token>`)
- **Response** (200 OK / 409 Conflict):
  - 200 OK: Re-attempts draft generation for eligible approved requests.
  - 409 Conflict: Certificate already generated for this request.
