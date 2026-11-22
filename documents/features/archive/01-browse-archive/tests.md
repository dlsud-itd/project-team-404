# Browse Archive Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/archive/components/archive-page/archive-page.spec.ts`: tabs, grouped rows, counts, loading/error/retry, and cursor pagination.
- `frontend/src/app/features/archive/services/archive.service.spec.ts`: query type/limit/cursor, flattening, sorting, totals, and next cursor.
- `frontend/src/app/features/archive/utils/archive-labels.util.spec.ts`: item labels and empty states.

### Backend Unit

- `backend/src/features/archive/archive.service.test.ts`: merges item types, filters by requested type, counts, ordering, and pagination.
- `backend/src/features/archive/validators/archive-query.validator.test.ts`: type/limit/cursor validation.
- `backend/src/features/archive/utils/archive-cursor.test.ts`: cursor encoding/decoding and invalid cursor handling.

### Postman

`tests/postman/15-archive/Project-Team-404 API - 15-archive.postman_collection.json` checks archive listing by type, first/next pages, cursor non-repetition, invalid limit, and auth (requests 14–18). See `tests/postman/15-archive/README.md`.

### Regression

`tests/regression/archive/archive.regression.spec.ts` covers archived item workflows through the API.

## End-to-End Gap

There is no dedicated `tests/e2e/archive` Playwright suite in the current tree; the Archive page is covered by frontend unit tests and Postman/regression flows.
