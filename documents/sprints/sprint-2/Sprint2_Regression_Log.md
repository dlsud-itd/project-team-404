# Sprint 2 Regression Log

Each entry records a Sprint 2 sign-off gate run of `npm run test:regression`,
including backend and frontend suites, E2E, and the project API regression
specs.

## Entry 1: November 5, 2026 (sign-off blocked)

- **Commit SHA:** `6aa5c47b5fc89b0c1d5e8fda64091ad22b3a7602` (HEAD; the regression
  changes in this worktree are uncommitted).
- **Database:** The required reset-and-seeded local database was not available.
  `npm run supabase:reset` failed because the Docker Desktop engine was not
  running. The configured isolated Supabase test database was not reset.
- **Full command:** `npm run test:regression`.
- **Result:** Not a sign-off pass. Both project API regression specs passed;
  backend tests and E2E failed, as detailed below.

| Suite                       | Command                                             | Status | Passed | Failed | Skipped | Notes                                                                     |
| --------------------------- | --------------------------------------------------- | ------ | ------ | ------ | ------- | ------------------------------------------------------------------------- |
| Backend unit                | `npm --prefix backend test`                         | Fail   | 239    | 5      | 0       | 1 task-create failure and 4 profile-update failures.                      |
| Backend integration         | `npm --prefix backend run test:integration`         | Fail   | 49     | 5      | 0       | Same five failures as the backend unit step.                              |
| Project API regression      | `npm --prefix backend run test:regression:projects` | Pass   | 2      | 0      | 0       | Signup/login, project CRUD, Inbox invariant, organization, and isolation. |
| Frontend unit + integration | `npm --prefix frontend run test:run`                | Pass   | 687    | 0      | 0       | 71 test files.                                                            |
| E2E                         | `npm run test:e2e`                                  | Fail   | -      | -      | -       | Local Supabase could not start without Docker.                            |
| Frontend regression         | `npm --prefix frontend run test:regression`         | Pass   | 17     | 0      | 0       | 4 regression specs.                                                       |

**Follow-up verification after the full run:**

- `npm --prefix backend run test:regression:projects` — 2 passed, 0 failed
  after final changes.
- A targeted backend integration rerun passed all 4 selected Sprint 1 profile
  update cases after shortening the generated integration usernames.
- The task-create integration case still fails against the configured test
  database: `recurrence_days` is missing (`P2022`). Regenerating Prisma Client
  confirmed the database needs the current migration; applying it requires a
  reset/migration run against the test database.
- No closed GitHub issues were found for Project CRUD or Project Organization,
  so there are no issue-numbered `bug-<issue#>-<slug>.spec.ts` files to add.
- The database and Docker failures are recorded here as follow-up blockers.
  The task-create failure should be filed as a Bug for the isolated test
  database missing the `recurrence_days` migration. No GitHub Bug issues were
  filed because this session has no issue-creation tool or GitHub CLI.

**`✅ CI: Verify All` checks** (individual equivalent commands):

| Check          | Result | Notes                                                                                                     |
| -------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Frontend tests | Pass   | 687 passed, 0 failed.                                                                                     |
| Backend tests  | Pass   | 190 passed; 54 integration tests skipped because this task invocation had no Supabase test configuration. |
| Frontend lint  | Pass   |                                                                                                           |
| Backend lint   | Pass   | 0 errors; 3 existing `no-console` warnings.                                                               |
| Format check   | Pass   |                                                                                                           |
| Frontend build | Pass   |                                                                                                           |
| Backend build  | Pass   |                                                                                                           |

The CI checks do not replace the required reset-and-seeded regression run:
the backend CI test command skipped integration cases, and E2E needs local
Supabase/Docker.

## Sign-off

| Role            | Name             | Date             | Decision                                                                        |
| --------------- | ---------------- | ---------------- | ------------------------------------------------------------------------------- |
| Project Manager | Matthew Sta. Ana | November 5, 2026 | Approved as an exception — reported by the user; technical gate remains blocked |
