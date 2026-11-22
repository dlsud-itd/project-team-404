# Restore Archived Item Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/archive/components/archive-page/archive-page.spec.ts`: restore removes an item from the page and updates counts.
- `frontend/src/app/features/archive/services/archive.service.spec.ts`: restores task/project/label state and keeps stores unchanged on request failure.
- `frontend/src/app/features/archive/components/archive-action/archive-action.spec.ts`: Undo/restore interaction.

### Backend Unit and Postman

- `backend/src/features/archive/archive.service.test.ts` covers listing only; per-kind restore state is tested by the owning task/project/label organization services and Postman APIs.
- `tests/postman/15-archive/Project-Team-404 API - 15-archive.postman_collection.json`: restores task, label, and project (requests 7, 10, and 13).

### Regression

`tests/regression/archive/archive.regression.spec.ts` covers the Archive API state changes and restored item visibility.

### E2E Gap

No dedicated Playwright Archive suite is present; restoration has frontend unit, Postman, and regression coverage.
