# Day 6 API Specification — Hardening & Edge-Case Protection

## Defensive Invariants & Error Contracts

### 1. Malformed ObjectId Rejection
- **Trigger**: Any endpoint receiving non-24 hex character ID string (e.g. `123`, `invalid-id`, `null`).
- **Status**: `400 Bad Request`
- **Response**:
  ```json
  {
    "success": false,
    "message": "Invalid ID format"
  }
  ```

### 2. State Violation Protection (Tamper Guard)
- **Trigger**: `PUT /api/admin/certificates/draft/:id` on a certificate with `status === 'issued'` or `'finalized'`.
- **Status**: `400 Bad Request`
- **Response**:
  ```json
  {
    "success": false,
    "message": "Only draft certificates can be edited"
  }
  ```

### 3. Duplicate Finalization Rejection (Idempotency Guard)
- **Trigger**: `POST /api/admin/certificates/:id/finalize` on already finalized certificate.
- **Status**: `409 Conflict`
- **Response**:
  ```json
  {
    "success": false,
    "message": "Certificate has already been finalized and cannot be re-finalized"
  }
  ```

### 4. Cross-Tenant Unauthorized Access
- **Trigger**: Intern A accessing Intern B's certificate metadata or PDF download.
- **Status**: `403 Forbidden`
- **Response**:
  ```json
  {
    "success": false,
    "message": "Access denied. You do not own this certificate request."
  }
  ```

### 5. Draft Exposure Guard
- **Trigger**: Intern attempting to retrieve or download a certificate currently in `draft` status.
- **Status**: `400 Bad Request`
- **Response**:
  ```json
  {
    "success": false,
    "message": "Certificate is currently in draft review and has not yet been issued."
  }
  ```
