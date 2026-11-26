# Current and Upcoming Dashboard Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID          | Test type      | Test file (repository-relative)                                                                                    | Result | Coverage / notes                                                                                                                                                                                                       |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DASHBOARD-01-T01 | Unit           | `frontend/src/app/features/dashboard/current-upcoming-tasks/current-upcoming-tasks.spec.ts`                        | Pass   | request states, grouping, user timezone, task limit, and retry                                                                                                                                                         |
| DASHBOARD-01-T02 | Unit           | `frontend/src/app/features/dashboard/current-upcoming-tasks/utils/group-by-day.util.spec.ts`                       | Pass   | grouping by calendar day and limiting groups                                                                                                                                                                           |
| DASHBOARD-01-T03 | Unit           | `frontend/src/app/features/dashboard/shared/services/dashboard.service.spec.ts`                                    | Pass   | query parameters and response mapping                                                                                                                                                                                  |
| DASHBOARD-01-T04 | Unit           | `backend/src/features/dashboard/current-upcoming-tasks/current-upcoming-tasks.service.test.ts`                     | Pass   | date-window request/response behavior                                                                                                                                                                                  |
| DASHBOARD-01-T05 | Unit           | `backend/src/features/dashboard/current-upcoming-tasks/current-upcoming-tasks.controller.test.ts`                  | Pass   | date-window request/response behavior                                                                                                                                                                                  |
| DASHBOARD-01-T06 | Unit           | `backend/src/features/dashboard/current-upcoming-tasks/validators/current-upcoming-query.validator.test.ts`        | Pass   | accepted window limits and timezone date boundaries                                                                                                                                                                    |
| DASHBOARD-01-T07 | Unit           | `backend/src/features/dashboard/shared/utils/date-window.util.test.ts`                                             | Pass   | accepted window limits and timezone date boundaries                                                                                                                                                                    |
| DASHBOARD-01-T08 | API collection | `tests/postman/09-current-upcoming-tasks/Project-Team-404 API - 09-current-upcoming-tasks.postman_collection.json` | Fail   | tests current/upcoming filters, timezone date windows, limits, and authentication; Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |
| DASHBOARD-01-T09 | End-to-end     | `tests/e2e/dashboard/current-upcoming.e2e.spec.ts`                                                                 | Fail   | checks the dashboard widget with the running app/API; E2E run: dashboard fixture is 98 hours old; suite requires a seed younger than 24 hours.                                                                         |

## Coverage Notes

Task dashboard sections are covered through the dashboard regression suite if present; API fixtures also use task CRUD regression helpers.
