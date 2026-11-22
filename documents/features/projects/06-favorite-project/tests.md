# Favorite Project Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/projects/project-organization/project-switcher/project-switcher.spec.ts`: favorite control state and user announcements.
- `frontend/src/app/features/projects/project-organization/services/project-organization.service.spec.ts`: favorite request, optimistic store update, and rollback on failure.
- `frontend/src/app/features/projects/shared/state/projects.store.spec.ts`: favorite project state and grouping.

### Backend Unit and Integration

- `backend/src/features/projects/project-organization/project-organization.service.test.ts`, `project-organization.controller.test.ts`, and `project-organization.routes.test.ts`: set/clear favorite, controller response, protected route behavior.
- `backend/tests/integration/features/projects/projects.integration.test.ts`: owner-scoped project state and persistence.
- There is no separate unit test for `set-project-favorite.query.ts` in the project query test inventory.

### Frontend Integration

`frontend/tests/integration/features/projects/projects.integration.spec.ts` exercises project organization controls through the real service/store with mocked HTTP.

### Postman

`tests/postman/06-project-organization/Project-Team-404 API - 06-project-organization.postman_collection.json` checks favorite, repeated idempotent favorite, persisted favorite state, and unfavorite (requests 7–10). See `tests/postman/06-project-organization/README.md`.

### End-to-End and Regression

- `tests/e2e/projects/project-organization.e2e.spec.ts`: favorites a project and verifies its state after reload as part of the organization journey.
- `tests/regression/projects/project-organization.regression.spec.ts`: verifies owned project organization actions while preserving Inbox and cross-user isolation.
