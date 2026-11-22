# Create Task from Home Tests

## Direct Coverage

### Frontend Unit

`frontend/src/app/features/home/home.spec.ts` checks the inline All Tasks composer and opening the New Task dialog from the Tasks tab. `frontend/src/app/features/home/board/all-tasks.spec.ts` covers quick-create form, defaults, saving, and errors.

### Frontend Integration

`frontend/tests/integration/features/tasks/tasks.integration.spec.ts` covers the task API/form path; Home-specific creation is exercised by the Home unit suite.

### Backend

Task creation is implemented and tested under [Tasks](../../tasks/02-create-task/tests.md): validator, controller/service, Postman, E2E, and regression coverage. There is no separate Home backend endpoint.

### E2E/Postman

No dedicated E2E or Postman case is scoped specifically to the Home inline composer. The shared `POST /api/tasks` API is covered by `tests/e2e/tasks/task-crud.e2e.spec.ts` and `tests/postman/07-task-crud`.
