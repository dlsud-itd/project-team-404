# Search Tasks and Projects Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/search/components/search-box/search-box.spec.ts`: debounce, keyboard navigation, archived toggle, empty/error states, and opening a result.
- `frontend/src/app/features/search/components/search-results/search-results.spec.ts`: grouped task/project results, highlighted matches, counts, and archived presentation.
- `frontend/src/app/features/search/services/search.service.spec.ts`: request params, mapping project names/priorities, and opening results.
- `frontend/src/app/features/search/utils/highlight-match.util.spec.ts`: safe highlighting for query text.

### Backend Unit

- `backend/src/features/search/search.service.test.ts` and `search.controller.test.ts`: type selection, concurrent result groups, and response mapping.
- `backend/src/features/search/validators/search-query.validator.test.ts`: query size/type/limit validation.
- `backend/src/features/search/utils/rank-results.util.test.ts`, `escape-like-literal.util.test.ts`, and `models/search-result.model.test.ts`: ranking, literal wildcard escaping, and result shape.

### Postman

`tests/postman/13-search/Project-Team-404 API - 13-search.postman_collection.json` has 16 requests covering task/project names and descriptions, ranking, snippets, independent type limits/totals, literal `%`, `_`, and backslash searches, archived inclusion, ownership, empty results, invalid queries, and missing authentication. See `tests/postman/13-search/README.md`.

### Regression

`tests/regression/search/search.regression.spec.ts` verifies owner-scoped search across task and project results.

## Test Gaps

There is no dedicated Search Playwright E2E or frontend integration spec in the current test tree. Search is covered by component/service unit tests, backend unit tests, Postman, and regression.
