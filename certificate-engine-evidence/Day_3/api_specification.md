# Day 3 API Specification — Certificate Draft Review

## Endpoints

### 1. Finalize & Approve Request
- **Route**: `POST /api/admin/requests/:id/action`
- **Auth**: Admin (`Bearer <token>`)
- **Body**:
  ```json
  {
    "action": "approve"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Request approved and certificate draft generated",
    "request": {
      "_id": "60d0fe4f5311236168a109ca",
      "status": "approved",
      "certificateId": "60d0fe4f5311236168a109cb"
    },
    "certificate": {
      "_id": "60d0fe4f5311236168a109cb",
      "certificateNumber": "CERT-2026-0001",
      "status": "draft"
    }
  }
  ```

### 2. Retrieve Certificate Draft
- **Route**: `GET /api/admin/certificates/draft/:id`
- **Auth**: Admin (`Bearer <token>`)
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "certificate": {
      "_id": "60d0fe4f5311236168a109cb",
      "certificateNumber": "CERT-2026-0001",
      "status": "draft",
      "htmlContent": "<!DOCTYPE html><html>...</html>",
      "userId": {
        "fullName": "Akshaya Marupaka",
        "email": "akshaya@example.com",
        "internCode": "INT-2026-081"
      }
    }
  }
  ```

### 3. Update Draft HTML
- **Route**: `PUT /api/admin/certificates/draft/:id`
- **Auth**: Admin (`Bearer <token>`)
- **Body**:
  ```json
  {
    "htmlContent": "<!DOCTYPE html><html>...updated content...</html>"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Certificate draft updated successfully",
    "certificate": {
      "_id": "60d0fe4f5311236168a109cb",
      "status": "draft",
      "updatedAt": "2026-09-12T01:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Empty HTML or invalid ObjectId.
  - `409 Conflict`: Attempt to modify finalized certificate.
