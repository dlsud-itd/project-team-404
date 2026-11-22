# Delete Project Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/projects/project-crud/project-list/project-list.spec.ts`: confirmation/cancel, one request on confirm, removing the card, moved-task notice, error display, and stale-project reload.
- `frontend/src/app/features/projects/project-crud/services/project.service.spec.ts`: DELETE request and shared-store removal.
- `frontend/src/app/features/projects/project-crud/project-form/project-form.spec.ts`: project permission/read-only behavior as applicable to the Inbox.

### Backend Unit and Integration

- `backend/src/features/projects/project-crud/project-crud.service.test.ts`: soft-delete delegation, Inbox protection, and missing-project handling.
- `backend/src/features/projects/project-crud/project-crud.controller.test.ts`: `204` response and `X-Moved-Task-Count` header.
- `backend/src/features/projects/project-crud/db/queries/soft-delete-owned-project.query.test.ts`: transactional soft-delete/task-move query behavior.
- `backend/tests/integration/features/projects/projects.integration.test.ts`: project lifecycle, ownership, and persisted project/task behavior.

### Frontend Integration

`frontend/tests/integration/features/projects/projects.integration.spec.ts` tests the real confirmation dialog and DELETE request with mocked HTTP.

### Postman

`tests/postman/05-project-crud/Project-Team-404 API - 05-project-crud.postman_collection.json` checks Inbox deletion rejection, foreign-owner deletion, successful soft deletion, removal from lists, `404` after deletion, repeated delete, and missing-token behavior (requests 19, 22–26, and 31). See `tests/postman/05-project-crud/README.md`.

### End-to-End and Regression

- `tests/e2e/projects/project-crud.e2e.spec.ts`: deletes a project after creating/editing it and verifies the lifecycle in the database.
- `tests/regression/projects/project-crud.regression.spec.ts`: covers project deletion in the CRUD API regression journey.

## Database Behavior

Deletion is a soft delete; it also moves undeleted tasks to Inbox. The E2E/integration assertions verify the observable result, and the query unit test covers the transaction.
