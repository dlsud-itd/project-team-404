# Delete Task Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/tasks/task-crud/task-list/task-list.spec.ts`: confirmation/cancel, one delete request, store removal, retry/error behavior, and stale-task reload.
- `frontend/src/app/features/tasks/task-crud/components/confirm-delete-dialog/confirm-delete-dialog.spec.ts`: confirmation dialog controls.
- `frontend/src/app/features/tasks/task-crud/services/task.service.spec.ts`: DELETE request and store update.

### Backend Unit and Integration

- `backend/src/features/tasks/task-crud/task-crud.service.test.ts` and `task-crud.controller.test.ts`: owner-scoped delete and response.
- `backend/src/features/tasks/task-crud/db/queries/soft-delete-task.query.test.ts`: soft-delete behavior.
- No dedicated backend integration directory exists for tasks; API behavior is covered by Postman and E2E.

### Frontend Integration

`frontend/tests/integration/features/tasks/tasks.integration.spec.ts` checks task delete confirmation and API responses through the real UI with mocked HTTP.

### Postman

`tests/postman/07-task-crud/Project-Team-404 API - 07-task-crud.postman_collection.json` checks soft deletion, removal from lists, missing/foreign task behavior, and authentication in its delete cases. See `tests/postman/07-task-crud/README.md`.

### End-to-End and Regression

- `tests/e2e/tasks/task-crud.e2e.spec.ts`: deletes a task and verifies it is absent afterward.
- `tests/regression/tasks/task-crud.regression.spec.ts`: exercises task deletion in the API CRUD flow.
