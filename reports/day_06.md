# Day 6 Report

## Objective
Run security-focused validation and hardening checks for the backend.

## Tasks completed
- Verified malformed ObjectId inputs are rejected before reaching model operations.
- Confirmed finalized certificates cannot be edited or overridden.
- Checked invalid status values and date-order validation rules.
- Tested that template variables render correctly in both camelCase and PascalCase forms.
- Verified mass-assignment protections remain active in admin and team-leader mutation routes.
- Confirmed sensitive user data is not exposed in error or overview responses.

## Technical details
Security is a major requirement for internship systems because they handle personal identity and internal review data. This work focused on preventing tampering, information leaks, and invalid state transitions in the backend.

## Result
The backend is hardened against common edge-case security issues and continues to behave predictably under invalid input.

## Risk/impact assessment
These checks protect against unauthorized modifications, data leaks, and broken business logic that could affect the certificate workflow and trust in the portal.

## Status
Completed.
