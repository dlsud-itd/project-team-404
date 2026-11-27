# Sprint 6 Regression Log

## Sprint 5 Summary

The Sprint 5 snapshot recorded a reset-and-seeded run on 2026-11-20. All 14
seed files and `verify_seeds.sql` passed. Backend unit tests (329), frontend
unit/integration tests (1,166), frontend regressions (17), lint, format, and
both builds passed. Backend integration failed 16 tests and backend API
regression failed 5 tests, so the run was not a sign-off pass. E2E was not run.
The Project Manager decision was pending. No Bug issues were filed for those
failures in that snapshot.

## Sprint 6 Summary

Sprint 6 delivered streaks, task/project reordering, Kanban board, and timeline
behavior, while carrying Sprint 5 search, archive, settings, and organization
coverage. The four requested Sprint 6 API regression cases added in this run
all passed. The full regression gate still fails: earlier backend and API
failures persist, and E2E reports 16 failures and one skipped test. This is not
a deployment sign-off.

## Entry 1: November 27, 2026 (sign-off blocked)

- **Commit:** `eb3eac8` (worktree changes are uncommitted).
- **Database:** Local Supabase reset completed. All 14 seed files reported
  `SUCCEEDED`; `verify_seeds.sql` reported `PASS`.
- **Command:** `npm run test:regression`.
- **Result:** Fail. The four added Sprint 6 API regression specs passed, but the
  complete gate did not.

| Suite                       | Command                                             | Status | Passed | Failed | Skipped | Notes                                                                                              |
| --------------------------- | --------------------------------------------------- | ------ | -----: | -----: | ------: | -------------------------------------------------------------------------------------------------- |
| Backend unit                | `npm --prefix backend test`                         | Pass   |    331 |      0 |       0 |                                                                                                    |
| Backend integration         | `npm --prefix backend run test:integration`         | Fail   |    147 |     15 |       0 | Failures in settings, labels, task board, priorities, streaks, dashboard, projects, and task CRUD. |
| Backend API regression      | `npm --prefix backend run test:regression:projects` | Fail   |     16 |      6 |       0 | Four new Sprint 6 regressions passed; six existing regressions failed.                             |
| Frontend unit + integration | `npm --prefix frontend run test:run`                | Pass   |   1398 |      0 |       0 | One todo test; no skipped tests.                                                                   |
| Frontend regression         | `npm --prefix frontend run test:regression`         | Pass   |     17 |      0 |       0 |                                                                                                    |
| End-to-end                  | `npm run test:e2e`                                  | Fail   |     31 |     16 |       1 | Failures affect dashboard, project organization, settings, labels/priorities, and task flows.      |

### Requested Sprint 6 regressions

| Spec                                      | Result | Assertion                                                                                                                    |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `streaks/streaks.regression.spec.ts`      | Pass   | Completing a recurring task twice creates exactly one next occurrence, in the same series, and records one completion event. |
| `organization/reorder.regression.spec.ts` | Pass   | New task appends after reordered tasks; existing task `orderBy` values and independent project reorder continue to work.     |
| `views/board.regression.spec.ts`          | Pass   | Checkbox state agrees with Done membership in both directions; board reordering leaves dashboard totals unchanged.           |
| `views/timeline.regression.spec.ts`       | Pass   | Deleted, archived, archived-project, and another user's tasks are absent from timeline results.                              |

### `✅ CI: Verify All`

The VS Code task completed all seven component checks:

| Check                             | Result | Notes                                       |
| --------------------------------- | ------ | ------------------------------------------- |
| Backend unit tests                | Pass   | 331 passed.                                 |
| Frontend unit + integration tests | Pass   | 1,398 passed, 1 todo, 0 skipped.            |
| Frontend lint                     | Pass   |                                             |
| Backend lint                      | Pass   | 0 errors; 3 existing `no-console` warnings. |
| Format check                      | Pass   |                                             |
| Frontend production build         | Pass   | Existing stylesheet budget warnings.        |
| Backend production build          | Pass   |                                             |

These CI component checks do not replace the failed backend integration,
regression, or E2E gate.

### Failures, Bug issues, and follow-up

The backend integration and API regression failures, plus the 16 E2E failures,
must be filed as Bug issues and assigned before sign-off. The available GitHub
tools in this session support reading and searching issues but do not expose
issue creation; no Bug IDs could be assigned, so corresponding
`bug-<issue#>-<slug>.spec.ts` files cannot yet be named. The Sprint 6 issue
search returned no closed Bug issues, and the repository issue listing returned
no open issues.

### Sign-off

| Role            | Name | Date | Decision                                 |
| --------------- | ---- | ---- | ---------------------------------------- |
| Project Manager |      |      | Pending; blocked by regression failures. |

No merge to `dev` or deployment sign-off was performed.
