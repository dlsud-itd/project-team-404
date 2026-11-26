# Dashboard Streak Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID          | Test type      | Test file (repository-relative)                                                                                    | Result | Coverage / notes                                                                                                                                                                          |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DASHBOARD-03-T01 | Unit           | `frontend/src/app/features/dashboard/streaks/streaks-section.spec.ts`                                              | Pass   | summary/task matching, at-risk ordering, completion, and reload                                                                                                                           |
| DASHBOARD-03-T02 | Unit           | `frontend/src/app/features/dashboard/streaks/utils/match-streak-tasks.util.spec.ts`                                | Pass   | summary/task matching, at-risk ordering, completion, and reload                                                                                                                           |
| DASHBOARD-03-T03 | Unit           | `frontend/src/app/features/tasks/task-streaks/services/task-streaks.service.spec.ts`                               | Pass   | cached streaks, timezone periods, and badge/details                                                                                                                                       |
| DASHBOARD-03-T04 | Unit           | `frontend/src/app/features/tasks/task-streaks/utils/streak-periods.util.spec.ts`                                   | Pass   | cached streaks, timezone periods, and badge/details                                                                                                                                       |
| DASHBOARD-03-T05 | Unit           | `frontend/src/app/features/tasks/task-streaks/components/streak-badge/streak-badge.spec.ts`                        | Pass   | cached streaks, timezone periods, and badge/details                                                                                                                                       |
| DASHBOARD-03-T06 | Unit           | `frontend/src/app/features/tasks/task-streaks/components/streak-detail/streak-detail.spec.ts`                      | Pass   | cached streaks, timezone periods, and badge/details                                                                                                                                       |
| DASHBOARD-03-T07 | Integration    | `frontend/tests/integration/features/tasks/task-streaks.integration.spec.ts`                                       | Pass   | recurring task streak updates after completion                                                                                                                                            |
| DASHBOARD-03-T08 | API collection | `tests/postman/17-sprint-6-streaks-views/Project-Team-404 API - 17-sprint-6-streaks-views.postman_collection.json` | Fail   | checks recurring streak views and completion effects; Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |

## Coverage Notes

The backend dashboard streaks route calls `TaskStreaksService.listDashboardStreaks`; there is no dedicated backend streak service unit test file in the current task test inventory.
No dedicated Playwright dashboard streak spec exists; frontend unit/integration and Postman cover the current behavior.
