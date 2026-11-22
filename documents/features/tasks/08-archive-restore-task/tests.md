# Archive and Restore Task Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/archive/components/archive-action/archive-action.spec.ts`: archive, undo, and restore button behavior.
- `frontend/src/app/features/archive/services/archive.service.spec.ts`: task archive/restore requests and task-store synchronization.
- `frontend/src/app/features/tasks/task-crud/task-form/task-form.spec.ts`: archived task read-only state and restore behavior.

### Backend Unit

- `backend/src/features/tasks/task-organization/task-organization.service.test.ts` and `task-organization.controller.test.ts`: task archive/restore behavior and errors.
- Task archived state is also checked by task CRUD and schedule services; archived tasks cannot be edited or scheduled.

### Postman

`tests/postman/15-archive/Project-Team-404 API - 15-archive.postman_collection.json` archives and restores a task, verifies the archive timestamp, and confirms archived tasks cannot be updated (requests 5–7).

### End-to-End and Regression

- `tests/e2e/tasks/task-organization.e2e.spec.ts`: task organization/archive flows.
- `tests/e2e/archive` and `tests/regression/archive/archive.regression.spec.ts`: shared Archive-page browse/restore behavior across item types.

## Cross-Feature Note

The task's archive state is managed by Tasks; the combined Archive page for tasks, projects, and labels is documented under the Archive feature.
