# Reorder Projects Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/projects/project-organization/utils/reorder-projects.util.spec.ts`: move calculations, group boundaries, and complete request IDs.
- `frontend/src/app/features/projects/project-organization/utils/split-projects.util.spec.ts`: Inbox/favorite/active/archive groups.
- `frontend/src/app/features/projects/project-organization/project-switcher/project-switcher.spec.ts`: drag/drop and move controls, position announcements, and request failure behavior.
- `frontend/src/app/features/projects/project-organization/services/project-organization.service.spec.ts`: optimistic order update, server result, and rollback.
- `frontend/src/app/features/projects/shared/state/projects.store.spec.ts`: applying and restoring sort orders.

### Backend Unit and Integration

- `backend/src/features/projects/project-organization/validators/reorder-projects.validator.test.ts`: empty, invalid, and duplicate IDs.
- `backend/src/features/projects/project-organization/utils/reorder-projects.util.test.ts`: normalized ordering.
- `backend/src/features/projects/project-organization/project-organization.service.test.ts`, `project-organization.controller.test.ts`, and `project-organization.routes.test.ts`: service/controller/route behavior.
- `backend/src/features/projects/project-organization/db/queries/update-project-sort-orders.query.test.ts`: transaction, ownership rejection, and updating requested order while retaining omitted owned projects.

### Frontend Integration

`frontend/tests/integration/features/projects/projects.integration.spec.ts` covers reorder controls, backend request, and state updates with the real project route/store and mocked API.

### Postman

`tests/postman/06-project-organization/Project-Team-404 API - 06-project-organization.postman_collection.json` checks a requested order, the resulting list order, duplicate/unknown/foreign IDs, rollback after a failed request, and invalid body shapes (requests 16–24 and 27). See the collection guide for the full order.

### End-to-End and Regression

- `tests/e2e/projects/project-organization.e2e.spec.ts`: reorders by drag/drop and keyboard and verifies persistence after reload.
- `tests/regression/projects/project-organization.regression.spec.ts`: verifies organization order and cross-user isolation through the API.
