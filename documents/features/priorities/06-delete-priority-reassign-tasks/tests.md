# Delete Priority and Reassign Tasks Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/settings/priorities/priority-settings.spec.ts`: delete dialog, replacement selection, errors, and success.
- `frontend/src/app/features/settings/priorities/delete-priority-dialog/delete-priority-dialog.spec.ts`: reassignment choices and dialog validation.
- `frontend/src/app/features/settings/services/priorities.service.spec.ts` and `priorities.store.spec.ts`: delete query parameters and removal/reassignment updates.
- `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`: used/unused level deletion and task/default reassignment interactions.

### Backend Unit and Integration

- `backend/src/features/priorities/priority-crud/priority-crud.service.test.ts`: missing reassignment, last-level protection, and delete flow.
- `backend/tests/integration/priorities.integration.test.ts`: deletes unused/used levels, reassigns tasks and default state, and verifies database results.

### Postman

`tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` deletes an unused level, rejects deleting a used one without reassignment, succeeds with a target, verifies old ID is gone, and checks default behavior after deletion (requests 11–20).

### Regression

`tests/regression/organization/labels-priorities.regression.spec.ts` covers user-scoped priority behavior while tasks continue to use valid levels.
