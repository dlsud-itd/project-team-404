# Set Task Priority and Labels Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/tasks/task-crud/task-form/task-form.spec.ts`: priority selection, label selection, and combined task save.
- `frontend/src/app/features/tasks/task-organization/services/label.service.spec.ts`: attach/detach label diff and refreshed label list.
- `frontend/src/app/features/tasks/task-crud/mappers/task.mapper.spec.ts`: priority ID and label response mapping.

### Backend Unit and Integration

- `backend/src/features/tasks/task-organization/validators/priority.validator.test.ts` and `task-labels.validator.test.ts`: valid/invalid inputs.
- `backend/src/features/tasks/task-organization/task-organization.service.test.ts` and `task-organization.controller.test.ts`: owned priority/labels, archived labels, and task state rules.
- `backend/src/features/tasks/task-organization/db/queries` contains task-label query tests where implemented; there is no dedicated task priority query test because priority updates share the task update query.

### Frontend Integration

`frontend/tests/integration/features/tasks/tasks.integration.spec.ts` checks task form priority/label fields and their API calls.

### Postman

- `tests/postman/08-task-organization/Project-Team-404 API - 08-task-organization.postman_collection.json`: label create/list/update/delete, priority setting, label attach/detach, duplicate and foreign-owner checks, and task filtering by priority/labels (requests 5–28 and 29–32).
- `tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json`: priority create/update/default/delete/reassign and task priority assignment, plus label CRUD.

### End-to-End and Regression

`tests/e2e/tasks/task-organization.e2e.spec.ts` and `tests/regression/organization/labels-priorities.regression.spec.ts` cover task label/priority organization and ownership boundaries.
