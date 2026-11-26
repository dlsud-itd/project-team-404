# Task Streak Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID      | Test type   | Test file (repository-relative)                                                               | Result | Coverage / notes                                           |
| ------------ | ----------- | --------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------- |
| TASKS-12-T01 | Unit        | `frontend/src/app/features/tasks/task-streaks/utils/streak-periods.util.spec.ts`              | Pass   | recurring period and streak calculations                   |
| TASKS-12-T02 | Unit        | `frontend/src/app/features/tasks/task-streaks/services/task-streaks.service.spec.ts`          | Pass   | caching, refresh after completion, and timezone behavior   |
| TASKS-12-T03 | Unit        | `frontend/src/app/features/tasks/task-streaks/components/streak-badge/streak-badge.spec.ts`   | Pass   | loading, error, and streak presentation                    |
| TASKS-12-T04 | Unit        | `frontend/src/app/features/tasks/task-streaks/components/streak-detail/streak-detail.spec.ts` | Pass   | loading, error, and streak presentation                    |
| TASKS-12-T05 | Integration | `frontend/tests/integration/features/tasks/task-streaks.integration.spec.ts`                  | Pass   | streak behavior through the app and task completion events |

## Coverage Notes

There is no dedicated backend test file for `task-streaks.service.ts` in the current task test inventory; streak API behavior is covered in Postman.
`tests/postman/17-sprint-6-streaks-views` exercises streak summary/API results alongside task view checks, including streaks after completion and recurrence.
No dedicated Playwright task-streak E2E file exists in `tests/e2e/tasks`; streak UI is covered by frontend unit/integration and Postman API checks.
