# Overdue Dashboard Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/dashboard/overdue-tasks/overdue-tasks.spec.ts`: request/loading/error, timezone deadline labels, task limits, retry, and edit links.
- `frontend/src/app/features/dashboard/overdue-tasks/components/overdue-badge/overdue-badge.spec.ts` and `utils/overdue-duration.util.spec.ts`: overdue age presentation.
- `frontend/src/app/features/dashboard/shared/services/dashboard.service.spec.ts`: overdue endpoint mapping.

### Backend Unit

- `backend/src/features/dashboard/overdue-tasks/overdue-tasks.service.test.ts` and `overdue-tasks.controller.test.ts`: overdue query/response behavior.
- `backend/src/features/dashboard/overdue-tasks/validators/overdue-query.validator.test.ts`: query validation.
- `backend/src/features/dashboard/shared/utils/date-window.util.test.ts`: timezone boundaries.

### Postman, E2E, and Regression

- `tests/postman/10-overdue-tasks/Project-Team-404 API - 10-overdue-tasks.postman_collection.json`: overdue task list semantics and empty results.
- `tests/e2e/dashboard/overdue.e2e.spec.ts`: dashboard overdue UI with real API fixtures.
- No dedicated dashboard overdue regression file was found in the current regression tree.
