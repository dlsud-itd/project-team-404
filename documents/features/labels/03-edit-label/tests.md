# Edit Label Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/settings/labels/label-settings.spec.ts`: edit mode, saving name/color, duplicate name feedback, and failed-save recovery.
- `frontend/src/app/features/settings/services/labels.service.spec.ts`: PUT URL/body and response mapping.
- `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`: edits labels through Settings routes and mocked HTTP.

### Backend Unit

- `backend/src/features/labels/label-crud/validators/update-label.validator.test.ts`: allowed update shape and field rules.
- `backend/src/features/labels/label-crud/label-crud.service.test.ts` and `label-crud.controller.test.ts`: update response, missing label, and duplicate name conflict.

### Postman and Regression

- `tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json`: renames/recolors a created label and checks duplicate-name handling (requests 14 and 9).
- `tests/regression/organization/labels-priorities.regression.spec.ts`: exercises label organization and ownership through the API.
