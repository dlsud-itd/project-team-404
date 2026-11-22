# Switch List and Board View Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/tasks/task-views/view-switcher/view-switcher.spec.ts`: list/board links and current-view state.
- `frontend/src/app/features/tasks/tasks.routes.spec.ts`: project task route and view routing.
- `frontend/tests/integration/features/tasks/tasks.integration.spec.ts`: URL view switching while preserving project/filter state.

### Backend Unit

- `backend/src/features/tasks/task-board/validators/board-query.validator.test.ts`: project/status/filter query validation.
- `backend/src/features/tasks/task-board/task-board.service.test.ts` and `task-board.controller.test.ts`: active project and board response behavior.

### Postman

`tests/postman/17-sprint-6-streaks-views` and `tests/postman/19-task-board` exercise board/list API data and filters. These collections test APIs, not the Angular view switch.

### End-to-End

`tests/e2e/tasks/task-organization.e2e.spec.ts` and `tests/e2e/tasks/task-crud.e2e.spec.ts` navigate task views and verify project-scoped task access.
