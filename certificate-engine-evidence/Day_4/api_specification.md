# Day 4 API Specification — PDF Finalization & Email Delivery

## Endpoints

### 1. Finalize Certificate & Dispatch Email
- **Route**: `POST /api/admin/certificates/:id/finalize`
- **Auth**: Admin (`Bearer <token>`)
- **Params**: `id` = Certificate Document ID
- **Responses**:
  - **200 OK (Full Success)**:
    ```json
    {
      "success": true,
      "message": "Certificate finalized, PDF generated, and email delivered successfully",
      "certificate": {
        "_id": "60d0fe4f5311236168a109cb",
        "status": "issued",
        "pdfPath": "uploads/certificates/CERT-2026-0001_1726084800000.pdf",
        "issuedDate": "2026-09-12T01:15:00.000Z"
      }
    }
    ```
  - **207 Multi-Status (Partial Success - PDF Generated, Email Delivery Failed)**:
    ```json
    {
      "success": true,
      "partialSuccess": true,
      "message": "Certificate PDF generated successfully, but email dispatch failed. Retry email delivery from admin dashboard.",
      "certificate": {
        "_id": "60d0fe4f5311236168a109cb",
        "status": "issued",
        "pdfPath": "uploads/certificates/CERT-2026-0001_1726084800000.pdf"
      },
      "emailError": "SMTP Connection Timeout"
    }
    ```
  - **409 Conflict**:
    ```json
    {
      "success": false,
      "message": "Certificate has already been finalized and cannot be re-finalized"
    }
    ```

### 2. Resend Certificate Email
- **Route**: `POST /api/admin/certificates/:id/resend`
- **Auth**: Admin (`Bearer <token>`)
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Certificate email dispatched successfully"
  }
  ```
