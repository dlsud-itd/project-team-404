# Create Project Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/projects/project-crud/project-form/project-form.spec.ts`: form validation, optional values, create submission, and API error handling.
- `frontend/src/app/features/projects/project-crud/validators/project-name.validator.spec.ts`: project name formatting and length rules.
- `frontend/src/app/features/projects/project-crud/services/project.service.spec.ts`: POST payload, response mapping, and store update.

### Backend Unit and Integration

- `backend/src/features/projects/project-crud/validators/create-project.validator.test.ts`: required name, maximum lengths, color validation, and rejected system fields.
- `backend/src/features/projects/project-crud/project-crud.service.test.ts` and `project-crud.controller.test.ts`: owner association, response shape, and `201` status.
- `backend/tests/integration/features/projects/projects.integration.test.ts`: creates a real project, checks saved owner/details/default flags, and confirms it appears in the owner's list.

### Frontend Integration

`frontend/tests/integration/features/projects/projects.integration.spec.ts` exercises the new-project popup through the real routes, form, service, and mocked API.

### Postman

`tests/postman/05-project-crud/Project-Team-404 API - 05-project-crud.postman_collection.json` creates setup projects and checks client-supplied Inbox flags, empty/overlong names, and invalid colors (requests 4–11). The full order and expected results are in `tests/postman/05-project-crud/README.md`.

### End-to-End and Regression

- `tests/e2e/projects/project-crud.e2e.spec.ts`: creates a project as part of the create/edit/delete journey and verifies it persists after reload and in the database.
- `tests/regression/projects/project-crud.regression.spec.ts`: creates an account and exercises project creation through the API.

## Database Test Notes

The create query has no standalone query test; creation persistence is asserted by the backend integration and E2E tests.
