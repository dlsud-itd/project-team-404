# Delete Label Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/settings/labels/label-settings.spec.ts`: delete confirmation, cancel, successful row removal, and failure handling.
- `frontend/src/app/features/settings/services/labels.service.spec.ts`: DELETE endpoint behavior.
- `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`: deletes a created label through the real settings page flow.

### Backend Unit

- `backend/src/features/labels/label-crud/label-crud.service.test.ts` and `label-crud.controller.test.ts`: `204`, missing-label handling, and owner scope.
- There is no dedicated test for `delete-label.query.ts` in the label unit inventory.

### Postman

`tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` deletes an unused label and a task-attached label, verifies task survival/label-link removal, and checks the API response (requests 13, 25, and 29–32).

### Regression

`tests/regression/organization/labels-priorities.regression.spec.ts` covers label ownership and label/task association behavior.
