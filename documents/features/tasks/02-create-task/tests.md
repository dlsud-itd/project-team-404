# Create Task Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/tasks/task-crud/task-form/task-form.spec.ts`: create form validation, defaults, payload, optional fields, and error states.
- `frontend/src/app/features/tasks/task-crud/components/new-task-dialog/new-task-dialog.spec.ts`: opening/closing the task popup.
- `frontend/src/app/features/tasks/task-crud/services/task.service.spec.ts` and `task.mapper.spec.ts`: create request mapping and store update.
- `frontend/src/app/features/tasks/task-crud/validators/task-title.validator.spec.ts`: title rules.

### Backend Unit and Integration

- `backend/src/features/tasks/task-crud/validators/create-task.validator.test.ts`: required title and payload validation.
- `backend/src/features/tasks/task-crud/task-crud.service.test.ts` and `task-crud.controller.test.ts`: Inbox default, owner/project validation, and response.
- `backend/tests/integration/features/tasks` has no dedicated integration suite; the real database path is covered by E2E and Postman.

### Frontend Integration

`frontend/tests/integration/features/tasks/tasks.integration.spec.ts` exercises task creation through the real route, form, stores, and mocked API.

### Postman

`tests/postman/07-task-crud/Project-Team-404 API - 07-task-crud.postman_collection.json` includes task setup/create requests, title/body validation, missing/deleted/foreign project rejection, and no-write checks after rejected assignments (requests 8–20).

### End-to-End and Regression

- `tests/e2e/tasks/task-crud.e2e.spec.ts`: creates tasks in a project and verifies saved details.
- `tests/regression/tasks/task-crud.regression.spec.ts`: creates tasks through the API and exercises the CRUD workflow.
