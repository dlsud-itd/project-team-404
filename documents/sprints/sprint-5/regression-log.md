# Sprint 5 Regression Log

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Entry 1: November 20, 2026 (sign-off blocked)

- **Commit:** `570fd56` (HEAD; regression changes in this worktree are uncommitted).
- **Database:** Local Supabase was reset and seeded before the run. All 14 seed
  SQL files succeeded and `verify_seeds.sql` reported `PASS`.
- **Command:** `npm run test:regression`.
- **E2E:** Not run, as requested.
- **Result:** Not a sign-off pass. The run had no skipped tests, but backend
  integration and backend API regression suites failed.

| Suite                       | Command                                             | Status | Passed | Failed | Skipped | Notes                                                              |
| --------------------------- | --------------------------------------------------- | ------ | -----: | -----: | ------: | ------------------------------------------------------------------ |
| Backend unit                | `npm --prefix backend test`                         | Pass   |    329 |      0 |       0 |                                                                    |
| Backend integration         | `npm --prefix backend run test:integration`         | Fail   |    146 |     16 |       0 | Failures detailed below.                                           |
| Backend API regression      | `npm --prefix backend run test:regression:projects` | Fail   |     13 |      5 |       0 | Regression discovery includes all `tests/regression/**/*.spec.ts`. |
| Frontend unit + integration | `npm --prefix frontend run test:run`                | Pass   |   1166 |      0 |       0 | 1 todo.                                                            |
| Frontend regression         | `npm --prefix frontend run test:regression`         | Pass   |     17 |      0 |       0 |                                                                    |

### Sprint 5 regression specs

| Spec                                   | Result | Notes                                                   |
| -------------------------------------- | ------ | ------------------------------------------------------- |
| `sort-filter.regression.spec.ts`       | Pass   | Legacy priority/label filters and default task order.   |
| `archive.regression.spec.ts`           | Pass   | Project archive/restore and task data preservation.     |
| `labels-priorities.regression.spec.ts` | Pass   | Priority-by-name and label CRUD compatibility.          |
| `settings.regression.spec.ts`          | Fail   | `/dashboard` response has no expected `total` field.    |
| `search.regression.spec.ts`            | Pass   | Search isolation/exclusions and dashboard non-mutation. |

### Outstanding failures

The backend integration failures are:

- Dashboard explicit limit overrides return HTTP 400 in both current/upcoming
  and overdue cases.
- Label reorder and priority reorder requests return HTTP 400.
- Settings authentication test observes a settings row where it expects none.
- Four task-streak assertions fail: late completion handling, missing `atRisk`,
  non-recurring streak response, and at-risk ordering.
- Task update response compatibility fails.
- Project list/archive filtering and favorite sorting expectations fail.
- Four test account setup/login requests returned HTTP 500.

The backend API regression failures are:

- Project organization does not return the full expected project list.
- Settings dashboard response is missing `total`.
- Task CRUD response keys differ from the legacy expected shape.
- Task completion timestamp and task response-key expectations differ in the
  scheduling regression.

### `âœ… CI: Verify All` component checks

| Check                             | Result | Notes                                       |
| --------------------------------- | ------ | ------------------------------------------- |
| Backend unit tests                | Pass   | 329 passed.                                 |
| Frontend unit + integration tests | Pass   | 1166 passed, 1 todo.                        |
| Frontend lint                     | Pass   |                                             |
| Backend lint                      | Pass   | 0 errors; 3 existing `no-console` warnings. |
| Format check                      | Pass   |                                             |
| Frontend build                    | Pass   | Existing landing stylesheet budget warning. |
| Backend build                     | Pass   |                                             |
| Backend typecheck                 | Pass   | `npm --prefix backend run typecheck`.       |

These component checks passed, but they do not override the failed backend
integration and regression suites above.

### Sign-off

| Role            | Name | Date | Decision                                 |
| --------------- | ---- | ---- | ---------------------------------------- |
| Project Manager |      |      | Pending; blocked by regression failures. |

No GitHub Bug issues were created for the failures in this run. The available
repository issue tools support listing and reading issues, but not creating
them; issue filing remains a follow-up.
