# Move Task on Board Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/tasks/task-views/board-view/board-view.spec.ts`: optimistic moves, rollback, error/conflict handling, and completion announcements.
- `board-view/utils/board-move.util.spec.ts`: column/task mapping and move calculations.
- `board-view/services/task-board.service.spec.ts`: board reorder payload and requests.
- `frontend/tests/integration/features/tasks/tasks.integration.spec.ts`: board rendering and move requests with task data.

### Backend Unit

- `backend/src/features/tasks/task-board/validators/board-reorder.validator.test.ts`: board move payloads.
- `backend/src/features/tasks/task-board/task-board.service.test.ts` and `task-board.controller.test.ts`: ownership/project checks and responses.
- `backend/src/features/tasks/task-board/db/queries/move-board-task.query.test.ts`: ordered transaction, status movement, stale state, and ownership cases.

### Postman

`tests/postman/19-task-board` covers board columns, filters, status moves, completion side effects, stale reorder requests, and ownership boundaries. `tests/postman/17-sprint-6-streaks-views` also captures board task IDs and verifies view/reorder API behavior.

### End-to-End

`tests/e2e/tasks/task-organization.e2e.spec.ts` verifies board/list organization flows; the Postman board collections provide the dedicated API matrix.
