# Set Default Priority Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/settings/priorities/priority-settings.spec.ts`: changing the default and announcing success/failure.
- `frontend/src/app/features/settings/state/priorities.store.spec.ts`: only the selected ID remains default.
- `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`: default selection updates the priority row and later task form default.

### Backend Unit and Integration

- `backend/src/features/priorities/priority-crud/priority-crud.service.test.ts`: setting the default and missing-level behavior.
- `backend/tests/integration/priorities.integration.test.ts`: changes the default and confirms exactly one active default remains in the database.

### Postman

`tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` sets a custom priority as default and later verifies a task without an explicit priority uses the current default (requests 9 and 17).
