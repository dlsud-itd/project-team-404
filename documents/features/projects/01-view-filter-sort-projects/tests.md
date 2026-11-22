# View, Filter, and Sort Projects Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/projects/project-crud/project-list/project-list.spec.ts`: loading/error states, Inbox-first layout, favorites grouping, archived filtering, favorites/color filters, URL state, sorting, and clearing empty-result filters.
- `frontend/src/app/features/projects/project-crud/services/project.service.spec.ts`: active/archived list requests and project mapping/store updates.
- `frontend/src/app/features/projects/shared/state/projects.store.spec.ts`: stable order and active/archived project state.
- `frontend/src/app/features/projects/project-organization/components/project-filter-bar/project-filter-bar.spec.ts`: filter controls and clear action.
- `frontend/src/app/features/projects/project-organization/utils/project-query-params.util.spec.ts`: reading and writing filter/sort query parameters.

### Backend Unit

- `backend/src/features/projects/project-crud/project-crud.service.test.ts` and `project-crud.controller.test.ts`: owner-scoped listing and response mapping.
- `backend/src/features/projects/project-crud/validators/list-projects-query.validator.test.ts`: allowed list filter/query values.
- `backend/src/features/projects/shared/db/queries/find-owned-projects.query.test.ts`: database filters, order, and limited results.

### Integration

- `frontend/tests/integration/features/projects/projects.integration.spec.ts`: real routes, session restore, project API requests, list states, filters, sorting, and project navigation with mocked HTTP.
- `backend/tests/integration/features/projects/projects.integration.test.ts`: active/archived/Inbox filtering, ownership isolation, deleted-project exclusion, and limit totals against the configured test database.

### Postman

`tests/postman/05-project-crud/Project-Team-404 API - 05-project-crud.postman_collection.json` includes request 12, which lists the owner’s projects including Inbox; the guide is `tests/postman/05-project-crud/README.md`.

### End-to-End and Regression

- `tests/e2e/projects/project-crud.e2e.spec.ts`: shows the Inbox first, lists seeded projects, and confirms the Inbox is read-only.
- `tests/regression/projects/project-crud.regression.spec.ts`: creates an account through signup, then verifies project CRUD through the API.

## Related Use

The project organization Postman, E2E, and regression suites also load project lists as setup for favorite/archive/reorder actions; their list requests are prerequisites rather than the primary assertion.
