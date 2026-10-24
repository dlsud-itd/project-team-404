# Sprint 1 Regression Log

Each entry records one full run of `npm run test:regression` (VS Code task **`🔁 Regression: Run All`**). The runner fails a suite that has failed or skipped tests, and reports a suite as Not run when it cannot start. The first entry that passes every suite becomes the Sprint 1 baseline that later sprints compare against.

How to run: see the Regression tests section in [`documents/setup.md`](../../setup.md).

## Entry 1: October 24, 2026 (pre-baseline)

- **Commit:** `10f54ad` on `test/sprint-one-regression`, plus the uncommitted runner, VS Code task, CI secrets and setup docs.
- **Database:** none. No Supabase test project was configured, so nothing was reset or seeded.
- **Result:** not a baseline. 2 suites passed, 1 failed on skipped tests, 2 were not run.

| Suite                       | Command                                     | Status  | Passed | Failed | Skipped | Notes                                                      |
| --------------------------- | ------------------------------------------- | ------- | ------ | ------ | ------- | ---------------------------------------------------------- |
| Backend unit                | `npm --prefix backend test`                 | Fail    | 84     | 0      | 18      | The 18 skipped are the two integration files (no test DB). |
| Backend integration         | `npm --prefix backend run test:integration` | Not run | -      | -      | -       | `SUPABASE_TEST_*` not set.                                 |
| Frontend unit + integration | `npm --prefix frontend run test:run`        | Pass    | 238    | 0      | 0       | 28 files. Coverage 92.78% statements, 94.77% lines.        |
| E2E                         | `npm run test:e2e`                          | Not run | -      | -      | -       | No E2E specs or `test:e2e` script exist (`testing/e2e`).   |
| Frontend regression         | `npm --prefix frontend run test:regression` | Pass    | 17     | 0      | 0       | 4 specs in `frontend/src/testing/regression/auth`.         |

**✅ CI: Verify All** checks, run on the same day:

| Check          | Result | Notes                                                                                                         |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Frontend lint  | Pass   |                                                                                                               |
| Backend lint   | Pass   | 0 errors, 3 warnings. Needs `DATABASE_URL`/`DIRECT_URL`; run with the CI placeholders.                        |
| Format check   | Pass   |                                                                                                               |
| Frontend build | Pass   |                                                                                                               |
| Backend build  | Pass   | Same `DATABASE_URL`/`DIRECT_URL` placeholders as CI. The local `backend/.env` lacks keys from `.env.example`. |

### Open items before the baseline

1. Configure an isolated Supabase test project, reset and seed it, and set `SUPABASE_TEST_URL`, `SUPABASE_TEST_SERVICE_ROLE_KEY` and `SUPABASE_TEST_DATABASE_URL` locally and as repository secrets.
2. Add the four E2E specs (registration, login & session, password recovery, profile) and a root `test:e2e` script.
3. Add a `bug-<issue#>-<slug>.spec.ts` regression spec for each closed Sprint 1 Bug issue.
4. Log every failure from the baseline run as a Bug issue.

## Sign-off

| Role            | Name | Date | Decision |
| --------------- | ---- | ---- | -------- |
| Project Manager |      |      | Pending  |
