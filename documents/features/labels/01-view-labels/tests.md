# View Labels Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/settings/labels/label-settings.spec.ts`: active/archived lists, loading/error states, and counts.
- `frontend/src/app/features/settings/services/labels.service.spec.ts`: `isArchived` query parameter and response mapping.

### Backend Unit

- `backend/src/features/labels/label-crud/label-crud.service.test.ts` and `label-crud.controller.test.ts`: owner-scoped list and response shape.
- `backend/src/features/labels/shared/models/label.model.test.ts`: public label model mapping.

### Frontend Integration

`frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts` exercises the real signed-in settings route, active/archived label loads, and task-form label pickers with mocked HTTP.

### Postman

`tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` checks active label listing and task count/sort fields (requests 21–22). `tests/postman/15-archive` verifies labels are listed/restored through the shared Archive API.

### Regression

`tests/regression/organization/labels-priorities.regression.spec.ts` covers per-user label organization and task associations.

## Backend Integration Note

There is no dedicated backend integration suite under `backend/tests/integration/features/labels`; label list behavior is exercised through Postman and the frontend integration fixture.
