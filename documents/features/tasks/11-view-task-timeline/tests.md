# Task Timeline Tests

## Direct Coverage

### Backend Unit

- `backend/src/features/tasks/task-timeline/validators/timeline-query.validator.test.ts`: date-window and query validation.
- `backend/src/features/tasks/task-timeline/utils/task-span.util.test.ts`: timeline span calculation.
- `backend/src/features/tasks/task-timeline/task-timeline.service.test.ts` and `task-timeline.controller.test.ts`: grouping, filtering, response shape, and error handling.

### Postman

`tests/postman/18-task-timeline/Project-Team-404 API - 18-task-timeline.postman_collection.json` tests baseline spans/undated counts, bars crossing the window, completed opt-in, project/task filters, and owner isolation. See its `README.md` for the request order.

### Frontend Coverage Gap

There is no frontend timeline component or frontend timeline test suite in the current app tree. The existing timeline behavior is API-only and is tested through backend unit tests and Postman.
