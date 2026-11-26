# Task Timeline Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID      | Test type      | Test file (repository-relative)                                                                  | Result | Coverage / notes                                                                                                                                                                                                                                                                                         |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TASKS-11-T01 | Unit           | `backend/src/features/tasks/task-timeline/validators/timeline-query.validator.test.ts`           | Pass   | date-window and query validation                                                                                                                                                                                                                                                                         |
| TASKS-11-T02 | Unit           | `backend/src/features/tasks/task-timeline/utils/task-span.util.test.ts`                          | Pass   | timeline span calculation                                                                                                                                                                                                                                                                                |
| TASKS-11-T03 | Unit           | `backend/src/features/tasks/task-timeline/task-timeline.service.test.ts`                         | Pass   | grouping, filtering, response shape, and error handling                                                                                                                                                                                                                                                  |
| TASKS-11-T04 | Unit           | `backend/src/features/tasks/task-timeline/task-timeline.controller.test.ts`                      | Pass   | grouping, filtering, response shape, and error handling                                                                                                                                                                                                                                                  |
| TASKS-11-T05 | API collection | `tests/postman/18-task-timeline/Project-Team-404 API - 18-task-timeline.postman_collection.json` | Fail   | tests baseline spans/undated counts, bars crossing the window, completed opt-in, project/task filters, and owner isolation. See its README.md for the request order; Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |

## Coverage Notes

There is no frontend timeline component or frontend timeline test suite in the current app tree. The existing timeline behavior is API-only and is tested through backend unit tests and Postman.
