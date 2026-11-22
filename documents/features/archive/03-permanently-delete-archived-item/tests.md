# Permanently Delete Archived Item Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/archive/components/archive-page/archive-page.spec.ts`: confirmation/cancel, delete success, row/count removal, and failure handling.
- `frontend/src/app/features/archive/services/archive.service.spec.ts`: DELETE routes for tasks/projects/labels and shared-store cleanup.
- `frontend/src/app/features/archive/utils/archive-labels.util.spec.ts`: kind-specific confirmation and toast wording.

### Backend Unit

- `backend/src/features/archive/archive.service.test.ts` covers archive listing; kind-specific deletion uses the task/project/label CRUD query tests.
- Task/project deletion query tests are listed under Tasks and Projects; label deletion has no dedicated query test file.

### Postman

`tests/postman/15-archive/Project-Team-404 API - 15-archive.postman_collection.json` focuses on archive, restore, paging, and auth; it does not permanently delete the seeded archived fixtures.

### Regression

`tests/regression/archive/archive.regression.spec.ts` covers the broader Archive workflow. Permanent deletion is also covered by CRUD Postman/E2E suites for each item type.

## Semantics

“Permanently” means removal from the Archive interface. Tasks and projects use soft-delete records; labels are deleted outright.
