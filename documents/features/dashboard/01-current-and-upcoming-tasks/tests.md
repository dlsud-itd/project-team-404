# Current and Upcoming Dashboard Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/dashboard/current-upcoming-tasks/current-upcoming-tasks.spec.ts`: request states, grouping, user timezone, task limit, and retry.
- `frontend/src/app/features/dashboard/current-upcoming-tasks/utils/group-by-day.util.spec.ts`: grouping by calendar day and limiting groups.
- `frontend/src/app/features/dashboard/shared/services/dashboard.service.spec.ts`: query parameters and response mapping.

### Backend Unit

- `backend/src/features/dashboard/current-upcoming-tasks/current-upcoming-tasks.service.test.ts` and `current-upcoming-tasks.controller.test.ts`: date-window request/response behavior.
- `backend/src/features/dashboard/current-upcoming-tasks/validators/current-upcoming-query.validator.test.ts` and `shared/utils/date-window.util.test.ts`: accepted window limits and timezone date boundaries.

### Postman

`tests/postman/09-current-upcoming-tasks/Project-Team-404 API - 09-current-upcoming-tasks.postman_collection.json` tests current/upcoming filters, timezone date windows, limits, and authentication.

### End-to-End

`tests/e2e/dashboard/current-upcoming.e2e.spec.ts` checks the dashboard widget with the running app/API.

### Regression

Task dashboard sections are covered through the dashboard regression suite if present; API fixtures also use task CRUD regression helpers.
