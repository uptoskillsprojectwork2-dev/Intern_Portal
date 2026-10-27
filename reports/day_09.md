# Day 9 Report

## Objective
Implement the notifications feature for Week 2 so certificate and admin events create both in-app and email-style activity records without disrupting normal request handling.

## Tasks completed
- Rechecked the Notification model and the current admin controller notification paths.
- Added safe notification creation logic that exits cleanly when no database connection is active.
- Hooked notification creation into certificate revoke and restore flows.
- Ensured notification payloads are trimmed and only created when the required user, title, and message are present.
- Confirmed the notification handling does not block the main certificate action response.

## Technical details
The notification system had to remain non-blocking because it is triggered from admin actions that already have a user-facing response. The implementation was therefore designed to return early if the DB is unavailable, while preserving the expected notification record when the connection is healthy.

## Result
Admins can revoke or restore certificates while generating user-facing notification records without causing request failures or noisy side effects.

## Risk/impact assessment
The current approach keeps notification delivery reliable and predictable. It also reduces the risk of hidden runtime failures when the application is running in a partially initialized or test environment.

## Status
Completed successfully.
