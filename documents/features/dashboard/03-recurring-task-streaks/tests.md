# Dashboard Streak Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/dashboard/streaks/streaks-section.spec.ts` and `utils/match-streak-tasks.util.spec.ts`: summary/task matching, at-risk ordering, completion, and reload.
- `frontend/src/app/features/tasks/task-streaks/services/task-streaks.service.spec.ts`, `utils/streak-periods.util.spec.ts`, `streak-badge.spec.ts`, and `streak-detail.spec.ts`: cached streaks, timezone periods, and badge/details.
- `frontend/tests/integration/features/tasks/task-streaks.integration.spec.ts`: recurring task streak updates after completion.

### Backend Unit

The backend dashboard streaks route calls `TaskStreaksService.listDashboardStreaks`; there is no dedicated backend streak service unit test file in the current task test inventory.

### Postman

`tests/postman/17-sprint-6-streaks-views/Project-Team-404 API - 17-sprint-6-streaks-views.postman_collection.json` checks recurring streak views and completion effects.

### End-to-End

No dedicated Playwright dashboard streak spec exists; frontend unit/integration and Postman cover the current behavior.
