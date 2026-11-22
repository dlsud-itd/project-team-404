# Task Streak Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/tasks/task-streaks/utils/streak-periods.util.spec.ts`: recurring period and streak calculations.
- `frontend/src/app/features/tasks/task-streaks/services/task-streaks.service.spec.ts`: caching, refresh after completion, and timezone behavior.
- `streak-badge.spec.ts` and `streak-detail.spec.ts`: loading, error, and streak presentation.
- `frontend/tests/integration/features/tasks/task-streaks.integration.spec.ts`: streak behavior through the app and task completion events.

### Backend Unit

There is no dedicated backend test file for `task-streaks.service.ts` in the current task test inventory; streak API behavior is covered in Postman.

### Postman

`tests/postman/17-sprint-6-streaks-views` exercises streak summary/API results alongside task view checks, including streaks after completion and recurrence.

### End-to-End

No dedicated Playwright task-streak E2E file exists in `tests/e2e/tasks`; streak UI is covered by frontend unit/integration and Postman API checks.
