# Move Task on Board Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID      | Test type   | Test file (repository-relative)                                                             | Result | Coverage / notes                                                                                                                          |
| ------------ | ----------- | ------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| TASKS-10-T01 | Unit        | `frontend/src/app/features/tasks/task-views/board-view/board-view.spec.ts`                  | Pass   | optimistic moves, rollback, error/conflict handling, and completion announcements                                                         |
| TASKS-10-T02 | Unit        | `frontend/src/app/features/tasks/task-views/board-view/utils/board-move.util.spec.ts`       | Pass   | column/task mapping and move calculations                                                                                                 |
| TASKS-10-T03 | Unit        | `frontend/src/app/features/tasks/task-views/board-view/services/task-board.service.spec.ts` | Pass   | board reorder payload and requests                                                                                                        |
| TASKS-10-T04 | Integration | `frontend/tests/integration/features/tasks/tasks.integration.spec.ts`                       | Pass   | board rendering and move requests with task data                                                                                          |
| TASKS-10-T05 | Unit        | `backend/src/features/tasks/task-board/validators/board-reorder.validator.test.ts`          | Pass   | board move payloads                                                                                                                       |
| TASKS-10-T06 | Unit        | `backend/src/features/tasks/task-board/task-board.service.test.ts`                          | Pass   | ownership/project checks and responses                                                                                                    |
| TASKS-10-T07 | Unit        | `backend/src/features/tasks/task-board/task-board.controller.test.ts`                       | Pass   | ownership/project checks and responses                                                                                                    |
| TASKS-10-T08 | Unit        | `backend/src/features/tasks/task-board/db/queries/move-board-task.query.test.ts`            | Pass   | ordered transaction, status movement, stale state, and ownership cases                                                                    |
| TASKS-10-T09 | End-to-end  | `tests/e2e/tasks/task-organization.e2e.spec.ts`                                             | Fail   | verifies board/list organization flows; the Postman board collections provide the dedicated API matrix; E2E run: 2 E2E assertions failed. |

## Coverage Notes

`tests/postman/19-task-board` covers board columns, filters, status moves, completion side effects, stale reorder requests, and ownership boundaries. `tests/postman/17-sprint-6-streaks-views` also captures board task IDs and verifies view/reorder API behavior.
