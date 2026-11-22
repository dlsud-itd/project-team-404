# Create Label Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/settings/labels/label-settings.spec.ts`: create form, color selection, duplicate name feedback, and create error/success states.
- `frontend/src/app/features/settings/services/labels.service.spec.ts`: POST body and label response mapping.

### Backend Unit

- `backend/src/features/labels/label-crud/validators/create-label.validator.test.ts`: required name, trimming, color format, and limits.
- `backend/src/features/labels/label-crud/label-crud.service.test.ts` and `label-crud.controller.test.ts`: create response and duplicate-name conflict.

### Frontend Integration

`frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts` creates a label in Settings and checks the updated list through mocked API responses.

### Postman

`tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` creates labels and rejects duplicate names, blank names, and invalid colors (requests 21 and 9–11). The guide is `tests/postman/11-labels-priorities/README.md`.

### Regression

`tests/regression/organization/labels-priorities.regression.spec.ts` checks labels remain scoped to their owner and can be associated with that user's tasks.
