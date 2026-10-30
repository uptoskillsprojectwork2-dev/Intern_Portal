# Day 2 Report

## Objective
Validate and stabilize the certificate request creation lifecycle for interns.

## Tasks completed
- Reviewed the request creation flow in the intern controller.
- Confirmed all required certificate types were recognized by the request path.
- Verified the eligibility rules for active and completed internships.
- Checked the logic for duplicate pending request prevention.
- Reproduced the failing request submission bug under test conditions.
- Fixed the request numbering issue by adding a safe fallback path when the counter is unavailable.

## Technical details
The issue was caused by the controller relying strictly on the Mongo counter during request generation. In test and isolated environments, the counter can be absent or not connected, which caused 500 responses instead of successful creation. The fix keeps the normal database counter approach but falls back safely when Mongo is unavailable.

## Result
Intern requests now create successfully for all required certificate types, invalid types are rejected with a clean 400 response, and the request-generation flow is resilient in both production and test environments.

## Risk/impact assessment
This issue directly blocked the certificate request creation flow and would have prevented interns from submitting valid requests. The fix restores the core user workflow.

## Status
Completed successfully.
