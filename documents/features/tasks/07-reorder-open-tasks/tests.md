# Reorder Open Tasks Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/tasks/task-organization/utils/reorder-tasks.util.spec.ts`: task movement and requested ID ordering.
- `frontend/src/app/features/tasks/task-crud/services/task.service.spec.ts`: optimistic order update and rollback.
- `frontend/src/app/features/tasks/task-crud/task-list/task-list.spec.ts`: drag/keyboard moves and disabled reorder states.

### Backend Unit

- `backend/src/features/tasks/task-organization/validators/reorder-tasks.validator.test.ts`: valid, incomplete/empty, duplicate, or malformed reorder payloads.
- `backend/src/features/tasks/task-organization/utils/reorder-tasks.util.test.ts`: assigned positions.
- `backend/src/features/tasks/task-organization/task-organization.service.test.ts`, `task-organization.controller.test.ts`, and `db/queries/update-task-positions.query.test.ts`: ownership, full-set checks, and transactional positions.

### Frontend Integration

`frontend/tests/integration/features/tasks/task-reorder.integration.spec.ts` verifies the app's reorder request and updated order.

### Postman

- `tests/postman/08-task-organization/Project-Team-404 API - 08-task-organization.postman_collection.json`: ordering through the task organization API.
- `tests/postman/16-task-reorder/Project-Team-404 API - 16-task-reorder.postman_collection.json`: complete ordering, append behavior, duplicates, empty list, foreign/other-project/deleted IDs, incomplete order conflict, and auth rejection (21 requests).

### End-to-End and Regression

- `tests/e2e/tasks/task-organization.e2e.spec.ts`: reorder by drag and keyboard, then verify after reload.
- `tests/regression/tasks/task-organization.regression.spec.ts`: order and ownership behavior through the API.
