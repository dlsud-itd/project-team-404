# Archive and Restore Task Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID      | Test type      | Test file (repository-relative)                                                      | Result | Coverage / notes                                                                                                                                                                                                                                                |
| ------------ | -------------- | ------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TASKS-08-T01 | Unit           | `frontend/src/app/features/archive/components/archive-action/archive-action.spec.ts` | Pass   | archive, undo, and restore button behavior                                                                                                                                                                                                                      |
| TASKS-08-T02 | Unit           | `frontend/src/app/features/archive/services/archive.service.spec.ts`                 | Pass   | task archive/restore requests and task-store synchronization                                                                                                                                                                                                    |
| TASKS-08-T03 | Unit           | `frontend/src/app/features/tasks/task-crud/task-form/task-form.spec.ts`              | Pass   | archived task read-only state and restore behavior                                                                                                                                                                                                              |
| TASKS-08-T04 | Unit           | `backend/src/features/tasks/task-organization/task-organization.service.test.ts`     | Pass   | task archive/restore behavior and errors                                                                                                                                                                                                                        |
| TASKS-08-T05 | Unit           | `backend/src/features/tasks/task-organization/task-organization.controller.test.ts`  | Pass   | task archive/restore behavior and errors                                                                                                                                                                                                                        |
| TASKS-08-T06 | API collection | `tests/postman/15-archive/Project-Team-404 API - 15-archive.postman_collection.json` | Fail   | archives and restores a task, verifies the archive timestamp, and confirms archived tasks cannot be updated (requests 5–7); Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |
| TASKS-08-T07 | End-to-end     | `tests/e2e/tasks/task-organization.e2e.spec.ts`                                      | Fail   | task organization/archive flows; E2E run: 2 E2E assertions failed.                                                                                                                                                                                              |
| TASKS-08-T08 | Regression     | `tests/regression/archive/archive.regression.spec.ts`                                | Pass   | tests/e2e/archive and : shared Archive-page browse/restore behavior across item types                                                                                                                                                                           |

## Coverage Notes

Task archived state is also checked by task CRUD and schedule services; archived tasks cannot be edited or scheduled.
The task's archive state is managed by Tasks; the combined Archive page for tasks, projects, and labels is documented under the Archive feature.
