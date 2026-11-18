# Team 404 (HabitFlow) - Sprint 5 Ceremony

Sprint 5: Filtering, Archive, Labels & Priorities, Settings & Search | November 8-14, 2026 | Last Updated: November 14, 2026 | Version 1.0.0

## Completion

| Sprint 5 Completion | Overall Sprint Tasks Completion | Overall Project Completion |
| ------------------- | ------------------------------- | -------------------------- |
| 29/56 tasks = 51%   | 224/305 tasks = 73%             | 269/355 tasks = 75%        |
| Sprint 5 tasks only | All sprint tasks only           | All tracked project tasks  |

## Sprint Planning

### Completed This Sprint: Sprint 5 and Carry-over

| Deliverable (origin)                        | Area(s)                                                  | Completed work                                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [Sprint 5] API specification                | Docs                                                     | - Created the API specification for filtering, archive, labels and priorities, settings, and search.                                |
| [Sprint 5] Test matrix                      | Docs                                                     | - Created the Sprint 5 test matrix.                                                                                                 |
| [Sprint 5] Filtering and task list rules    | Database + Backend code                                  | - Completed the database and backend code for task and project filters, sorting, validation, and response behavior.                 |
| [Sprint 5] Archive and restore behavior     | Database + Backend code                                  | - Completed the database and backend code for archive state, restore behavior, archived-resource restrictions, and archive listing. |
| [Sprint 5] Labels and priorities management | Database + Backend code + Frontend code + Frontend tests | - Completed database and backend code, plus the labels and priorities UI and its frontend integration tests.                        |
| [Sprint 5] Settings and dashboard behavior  | Database + Backend code + Frontend code + Frontend tests | - Completed database and backend code, plus Settings pages, dashboard limits, preferences, and their frontend integration tests.    |
| [Sprint 5] Search                           | Database + Backend code                                  | - Completed the database and backend code for task/project search and archived-item handling.                                       |

### Completed Carry-over Tasks

| Deliverable (carried from)                     | Area(s) | Completed work                                                                                                                          |
| ---------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [Carry-over from Sprint 3] Task E2E tests      | Tests   | - Completed browser E2E coverage for task CRUD, scheduling, and organization; the task tracker records completion on November 14, 2026. |
| [Carry-over from Sprint 4] Dashboard E2E tests | Tests   | - Completed the Current & Upcoming and Overdue dashboard E2E specs; the task tracker records completion on November 14, 2026.           |
| [Carry-over from Sprint 4] Regression tests    | Tests   | - Completed the Sprint 1–4 regression pass and sign-off work; the task tracker records completion on November 14, 2026.                 |

> Area attribution note: All Sprint 5 database and backend code tasks are complete. No Sprint 5 backend integration tests are complete; the task tracker marks them Ready. Sprint 5 E2E and Regression tasks are Blocked. Remaining work below does not include database or backend code implementation.

### Remaining Work Carried Over to Next Sprint

| Workstream          | Area(s)                                                    | Tracker status and remaining work                                                                                                                 |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sorting & Filtering | Backend tests + Frontend code + Frontend tests + E2E tests | - Backend integration tests are Ready, not done; frontend code is In progress; finish frontend tests and E2E validation.                          |
| Archive             | Backend tests + Frontend code + Frontend tests + E2E tests | - Backend integration tests are Ready, not done; frontend code is Ready and frontend tests are Blocked; finish UI integration and E2E validation. |
| Labels & Priorities | Backend tests + E2E tests                                  | - Backend integration tests are Ready, not done; run Sprint 5 E2E coverage after the integration prerequisites pass.                              |
| Settings            | Backend tests + E2E tests                                  | - Backend integration tests are Ready, not done; run Sprint 5 E2E coverage after the integration prerequisites pass.                              |
| Search              | Backend tests + Frontend code + Frontend tests + E2E tests | - Backend integration tests are Ready, not done; frontend code is Ready and frontend tests are Blocked; finish UI integration and E2E validation. |
| Sprint 5 sign-off   | E2E tests + Regression tests                               | - Sprint 5 E2E and Regression tasks are Blocked; run them after the feature-level integration tests pass and record the results.                  |

## Sprint Retrospective

### What went well?

- The Sprint 5 API specification was created early and gave the team a clear contract for implementation.
- Database and backend code for the Sprint 5 features are complete; none of the Sprint 5 backend integration tests are complete.
- Frontend code and integration tests are complete for Labels & Priorities and Settings.

### What could be improved?

- The Sprint 5 test matrix was completed late. The task should have been assigned clearly by directly messaging the assignee and confirming ownership and timing.
- Frontend work remains for Filtering, Archive, and Search; all Sprint 5 backend integration tests and Sprint 5 E2E/regression checks remain incomplete.

### What needs to be done?

- Finish the remaining Sprint 5 frontend work for Filtering, Archive, and Search.
- Complete and record all Sprint 5 backend integration tests and the outstanding frontend integration tests.
- Run and record Sprint 5 E2E and regression checks after their integration prerequisites pass, then complete sign-off.
