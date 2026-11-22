# Reorder Priorities Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/settings/priorities/priority-settings.spec.ts`: drag/move controls, saved order, announcement, and rollback toast.
- `frontend/src/app/features/settings/state/priorities.store.spec.ts`: immediate reorder and rollback.
- `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`: reorder request and final ordering in the Settings page.

### Backend Unit and Integration

- `backend/src/features/priorities/priority-crud/priority-crud.service.test.ts`: reorder behavior.
- `backend/tests/integration/priorities.integration.test.ts`: persists requested order and rejects unknown/foreign or incomplete IDs.
- The priority route has no separate route test file in the current test inventory.

### Postman

`tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` reorders custom priorities and rejects incomplete, duplicate, or foreign IDs (requests 4 and 20 in the integration flow).
