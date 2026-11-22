# Edit Task Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/tasks/task-crud/task-form/task-form.spec.ts`: loading edit data, sending changed fields, label synchronization, validation, and saving/error states.
- `frontend/src/app/features/tasks/task-crud/services/task.service.spec.ts` and `task.mapper.spec.ts`: PUT payload and response mapping.
- `frontend/src/app/features/tasks/task-crud/mappers/task-error.mapper.spec.ts`: task field errors.

### Backend Unit and Integration

- `backend/src/features/tasks/task-crud/validators/update-task.validator.test.ts`: valid partial updates and rejected empty/invalid updates.
- `backend/src/features/tasks/task-crud/task-crud.service.test.ts` and `task-crud.controller.test.ts`: update, ownership, archived state, and response.
- `backend/tests/integration/features/tasks`: no dedicated task integration test directory.

### Frontend Integration

`frontend/tests/integration/features/tasks/tasks.integration.spec.ts` checks opening a task edit route, loading the task, submitting changes, and preserving form state on errors.

### Postman

`tests/postman/07-task-crud/Project-Team-404 API - 07-task-crud.postman_collection.json` checks update persistence and rejected updates to another user's task/project (requests 29–33 and related ownership cases).

### End-to-End and Regression

- `tests/e2e/tasks/task-crud.e2e.spec.ts`: edits task fields and checks persistence after reload.
- `tests/regression/tasks/task-crud.regression.spec.ts`: updates a task through the CRUD API.
