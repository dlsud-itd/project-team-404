# Archive and Restore Label Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/settings/labels/label-settings.spec.ts`: active/archive list movement, undo, restore, and request failure rollback.
- `frontend/src/app/features/settings/services/labels.service.spec.ts`: archive endpoint and response mapping.
- `frontend/src/app/features/archive/services/archive.service.spec.ts` and `archive-page.spec.ts`: restore through the combined Archive page.
- `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`: label archive/restore behavior through Settings.

### Backend Unit

Label archive has no separate backend unit-test file in the label inventory; route behavior is covered in Postman and regression API flows.

### Postman

- `tests/postman/11-labels-priorities`: label/task behavior that rejects archived labels when attaching them.
- `tests/postman/15-archive`: archive and restore label requests and task attachment restrictions.

### Regression

`tests/regression/organization/labels-priorities.regression.spec.ts` covers label organization; `tests/regression/archive/archive.regression.spec.ts` covers shared archive behavior.
