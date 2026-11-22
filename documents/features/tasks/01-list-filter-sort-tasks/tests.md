# List, Filter, and Sort Tasks Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/tasks/task-crud/task-list/task-list.spec.ts`: task list loading, filter/sort query state, rejected filter handling, empty/error states, and reordering availability.
- `frontend/src/app/features/tasks/task-crud/services/task.service.spec.ts`: query parameter construction and task response mapping.
- `frontend/src/app/features/tasks/task-organization/components/filter-bar/filter-bar.spec.ts` and `sort-menu` specs: filter and sort controls.
- `frontend/src/app/features/tasks/task-organization/utils/task-query-params.util.spec.ts`: converting filters to/from URL parameters.
- `frontend/src/app/features/tasks/task-organization/validators/task-filter.validator.spec.ts`: task filter validation where present in the frontend suite.

### Backend Unit and Integration

- `backend/src/features/tasks/task-crud/validators/list-tasks-query.validator.test.ts`: valid/invalid task query parameters.
- `backend/src/features/tasks/task-crud/task-crud.service.test.ts` and `task-crud.controller.test.ts`: owner-scoped list and response mapping.
- `backend/src/features/tasks/task-organization/validators/task-filter.validator.test.ts`: organization filter validation.
- `backend/tests/integration/features/tasks` has no dedicated integration directory; task API behavior is exercised by Postman and E2E.

### Frontend Integration

`frontend/tests/integration/features/tasks/tasks.integration.spec.ts` and `sort-filter.integration.spec.ts` cover the real task route, API filters, status, ordering, and UI query state with mocked HTTP.

### Postman

- `tests/postman/07-task-crud/Project-Team-404 API - 07-task-crud.postman_collection.json`: project-scoped active/completed lists and paging (requests 21–24), plus authentication and ownership failures.
- `tests/postman/12-sort-filter/Project-Team-404 API - 12-sort-filter.postman_collection.json`: a task filter matrix, task sort matrix, project matrix, and invalid-query/auth cases (requests 4–9).

### End-to-End and Regression

- `tests/e2e/tasks/task-crud.e2e.spec.ts`: task lists, project scope, and persistence during CRUD.
- `tests/e2e/tasks/task-organization.e2e.spec.ts`: organization/filter interactions.
- `tests/regression/tasks/task-crud.regression.spec.ts` and `task-organization.regression.spec.ts`: API-level list and ownership behavior.
