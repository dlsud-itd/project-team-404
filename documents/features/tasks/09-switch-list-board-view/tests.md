# Switch List and Board View Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID      | Test type   | Test file (repository-relative)                                                  | Result | Coverage / notes                                                                             |
| ------------ | ----------- | -------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| TASKS-09-T01 | Unit        | `frontend/src/app/features/tasks/task-views/view-switcher/view-switcher.spec.ts` | Pass   | list/board links and current-view state                                                      |
| TASKS-09-T02 | Unit        | `frontend/src/app/features/tasks/tasks.routes.spec.ts`                           | Pass   | project task route and view routing                                                          |
| TASKS-09-T03 | Integration | `frontend/tests/integration/features/tasks/tasks.integration.spec.ts`            | Pass   | URL view switching while preserving project/filter state                                     |
| TASKS-09-T04 | Unit        | `backend/src/features/tasks/task-board/validators/board-query.validator.test.ts` | Pass   | project/status/filter query validation                                                       |
| TASKS-09-T05 | Unit        | `backend/src/features/tasks/task-board/task-board.service.test.ts`               | Pass   | active project and board response behavior                                                   |
| TASKS-09-T06 | Unit        | `backend/src/features/tasks/task-board/task-board.controller.test.ts`            | Pass   | active project and board response behavior                                                   |
| TASKS-09-T07 | End-to-end  | `tests/e2e/tasks/task-organization.e2e.spec.ts`                                  | Fail   | navigate task views and verify project-scoped task access; E2E run: 2 E2E assertions failed. |
| TASKS-09-T08 | End-to-end  | `tests/e2e/tasks/task-crud.e2e.spec.ts`                                          | Fail   | navigate task views and verify project-scoped task access; E2E run: 1 E2E assertion failed.  |

## Coverage Notes

`tests/postman/17-sprint-6-streaks-views` and `tests/postman/19-task-board` exercise board/list API data and filters. These collections test APIs, not the Angular view switch.
