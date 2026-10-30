# Day 1 Report

## Objective
Fix the core data-model and workflow issues that affected request tracking, analytics, and safe request numbering in the internship portal.

## Tasks completed
- Added `forwardedBy` to track which team leader forwarded a request.
- Added `forwardedAt` to capture the exact time a request moved from pending to processing.
- Created the `Counter` model to support atomic request numbering without race conditions.
- Implemented the counter-based generation logic for request IDs like `CERT-2026-00001`.
- Added composite indexes for `status`, `requestedAt`, `userId`, and `forwardedBy` to improve analytics and filtering.
- Validated that backend role names and route prefixes remain consistent for `intern`, `teamleader`, and `admin` flows.

## Technical details
This phase addressed the biggest operational gap: without forward tracking, the system could not tell how long a request remained with a team leader or how requests moved through the review queue. The new counter logic prevents duplicate request numbers when multiple requests are created at the same time.

## Result
The system now supports:
- team-leader forwarded review tracking
- unique request numbers per request sequence
- faster retrieval of pending or forwarded requests for reporting and filtering

## Risk/impact assessment
These changes reduce operational confusion and prevent duplicate certificate request numbers, which are critical for accurate analytics and user trust.

## Status
Completed and documented in [../day_one.md](../day_one.md).
