# Edit Project Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/projects/project-crud/project-form/project-form.spec.ts`: loads edit data, sends only changed values, validates inputs, and handles missing project/API errors.
- `frontend/src/app/features/projects/project-crud/services/project.service.spec.ts`: GET/PATCH requests and shared-store upserts.
- `frontend/src/app/features/projects/project-crud/mappers/project.mapper.spec.ts` and `project-error.mapper.spec.ts`: response mapping and field/not-found errors.

### Backend Unit and Integration

- `backend/src/features/projects/project-crud/project-crud.service.test.ts`: update behavior and Inbox read-only protection.
- `backend/src/features/projects/project-crud/project-crud.controller.test.ts`: project response mapping.
- `backend/src/features/projects/project-crud/validators/update-project.validator.test.ts`: permitted fields and validation rules.
- `backend/tests/integration/features/projects/projects.integration.test.ts`: owner-scoped reads/updates and persisted project fields.

### Frontend Integration

`frontend/tests/integration/features/projects/projects.integration.spec.ts` opens the real edit route, loads project data, submits updates, and checks server validation/error handling through a mocked API.

### Postman

`tests/postman/05-project-crud/Project-Team-404 API - 05-project-crud.postman_collection.json` checks updating own project fields and verifying persistence (requests 16–18), plus rejecting update attempts against another user's project (request 21). See `tests/postman/05-project-crud/README.md`.

### End-to-End and Regression

- `tests/e2e/projects/project-crud.e2e.spec.ts`: edits a project and verifies the change survives reload and is saved in the database.
- `tests/regression/projects/project-crud.regression.spec.ts`: exercises project updates in the CRUD API journey.

## Test Gap

There is no standalone unit test for `update-owned-project.query.ts`; persistence is covered by backend integration, Postman, and E2E tests.
