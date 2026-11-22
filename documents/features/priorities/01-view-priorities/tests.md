# View Priorities Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/settings/priorities/priority-settings.spec.ts`: renders levels, default badge, counts, loading/error states.
- `frontend/src/app/features/settings/services/priorities.service.spec.ts`: GET response mapping and ordering.
- `frontend/src/app/features/settings/state/priorities.store.spec.ts`: built-in fallback, server levels, default, and reset-on-signout behavior.

### Backend Unit and Integration

- `backend/src/features/priorities/priority-crud/priority-crud.service.test.ts`: owner-scoped priority operations.
- `backend/tests/integration/priorities.integration.test.ts`: provisions separate Low/Medium/High rows per account and confirms Medium is the default.

### Frontend Integration

`frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts` verifies priorities load through the signed-in settings routes and feed task forms/filters.

### Postman

`tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` starts by listing priorities, capturing IDs, and checking separate user ownership (requests 1–5).

## Other Coverage

Task CRUD, settings, and Postman suites also load priorities as setup for task creation/filtering; those assertions target the consuming feature.
