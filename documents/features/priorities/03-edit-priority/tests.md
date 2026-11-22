# Edit Priority Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/settings/priorities/priority-settings.spec.ts`: editing names/colors, duplicate-name feedback, and server errors.
- `frontend/src/app/features/settings/services/priorities.service.spec.ts` and `priorities.store.spec.ts`: PUT payload and store replacement.
- `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`: renames and recolors a custom priority through Settings.

### Backend Unit and Integration

- `backend/src/features/priorities/priority-crud/priority-crud.service.test.ts`: update and duplicate-name behavior.
- `backend/tests/integration/priorities.integration.test.ts`: reads, renames, recolors, and checks saved values.

### Postman

`tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` renames/recolors a custom priority, rejects a duplicate name for the same owner, and allows the same name for another owner (requests 7–10).
