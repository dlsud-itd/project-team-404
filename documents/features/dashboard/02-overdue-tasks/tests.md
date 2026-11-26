# Overdue Dashboard Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID          | Test type      | Test file (repository-relative)                                                                    | Result | Coverage / notes                                                                                                                                                                   |
| ---------------- | -------------- | -------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DASHBOARD-02-T01 | Unit           | `frontend/src/app/features/dashboard/overdue-tasks/overdue-tasks.spec.ts`                          | Pass   | request/loading/error, timezone deadline labels, task limits, retry, and edit links                                                                                                |
| DASHBOARD-02-T02 | Unit           | `frontend/src/app/features/dashboard/overdue-tasks/components/overdue-badge/overdue-badge.spec.ts` | Pass   | overdue age presentation                                                                                                                                                           |
| DASHBOARD-02-T03 | Unit           | `frontend/src/app/features/dashboard/overdue-tasks/utils/overdue-duration.util.spec.ts`            | Pass   | overdue age presentation                                                                                                                                                           |
| DASHBOARD-02-T04 | Unit           | `frontend/src/app/features/dashboard/shared/services/dashboard.service.spec.ts`                    | Pass   | overdue endpoint mapping                                                                                                                                                           |
| DASHBOARD-02-T05 | Unit           | `backend/src/features/dashboard/overdue-tasks/overdue-tasks.service.test.ts`                       | Pass   | overdue query/response behavior                                                                                                                                                    |
| DASHBOARD-02-T06 | Unit           | `backend/src/features/dashboard/overdue-tasks/overdue-tasks.controller.test.ts`                    | Pass   | overdue query/response behavior                                                                                                                                                    |
| DASHBOARD-02-T07 | Unit           | `backend/src/features/dashboard/overdue-tasks/validators/overdue-query.validator.test.ts`          | Pass   | query validation                                                                                                                                                                   |
| DASHBOARD-02-T08 | Unit           | `backend/src/features/dashboard/shared/utils/date-window.util.test.ts`                             | Pass   | timezone boundaries                                                                                                                                                                |
| DASHBOARD-02-T09 | API collection | `tests/postman/10-overdue-tasks/Project-Team-404 API - 10-overdue-tasks.postman_collection.json`   | Fail   | overdue task list semantics and empty results; Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |
| DASHBOARD-02-T10 | End-to-end     | `tests/e2e/dashboard/overdue.e2e.spec.ts`                                                          | Fail   | dashboard overdue UI with real API fixtures; E2E run: dashboard fixture is 98 hours old; suite requires a seed younger than 24 hours.                                              |

## Coverage Notes

No dedicated dashboard overdue regression file was found in the current regression tree.
