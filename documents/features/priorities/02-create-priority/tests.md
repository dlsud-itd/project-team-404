# Create Priority Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/settings/priorities/priority-settings.spec.ts`: create form, color, duplicate name, and errors.
- `frontend/src/app/features/settings/services/priorities.service.spec.ts` and `priorities.store.spec.ts`: POST payload, response mapping, and store update.
- `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`: creates custom priorities through the real Settings page/API client with mocked HTTP.

### Backend Unit and Integration

- `backend/src/features/priorities/priority-crud/priority-crud.service.test.ts`: create/list/update/default/delete workflows and duplicate handling.
- `backend/tests/integration/priorities.integration.test.ts`: creates a custom priority and confirms persisted name/color/order/default.

### Postman

`tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` creates custom priorities and rejects duplicate names (requests 6, 10–11).

### Regression

`tests/regression/organization/labels-priorities.regression.spec.ts` uses account-specific priorities while testing organization flows.
