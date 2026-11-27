# Local development setup

This guide uses the repository's VS Code tasks for installation, configuration,
development, and verification.

## Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/)
- Node.js 22 or later and npm
- A Supabase project

Open the repository root folder in VS Code. Open the Command Palette with
`Ctrl+Shift+P`, choose **Tasks: Run Task**, and select the task by its label.

## First-time setup

1. Run **`📦 Install All Dependencies`**.
2. Run **`🛠️ Setup: Create Environment Files`**. This creates
   `frontend/.env` and `backend/.env` from their example files. Existing `.env`
   files are kept and are not overwritten.
3. Edit the two `.env` files with your local Supabase project values:

   - In `frontend/.env`, set `NG_APP_SUPABASE_URL` and
     `NG_APP_SUPABASE_ANON_KEY` to the Supabase project URL and publishable
     (anonymous) key. Set `NG_APP_API_BASE_URL` to `http://localhost:3000`.
   - In `backend/.env`, set `SUPABASE_URL` and
     `SUPABASE_SERVICE_ROLE_KEY`. Set `CORS_ALLOWED_ORIGINS` to
     `http://localhost:4200` for local development. Set `WEB_APP_URL` to
     `http://localhost:4200` locally and to the deployed frontend origin in
     production. Set `BREVO_API_KEY` to a Brevo API key and
     `BREVO_SENDER_EMAIL` to an email address verified in Brevo. Optionally set
     `BREVO_SENDER_NAME` (defaults to `HabitFlow`).

   - The `NG_APP_` values are bundled into the browser application and must not
     contain secrets. The backend service-role key is privileged and must
     remain private; never put it in `frontend/.env`.
   - To use the local console mailer instead, leave `BREVO_API_KEY` and
     `BREVO_SENDER_EMAIL` blank.

4. In the Command Palette, run **`🔐 Supabase: Login`** and then
   **`🔗 Supabase: Link Project`**. Follow the Supabase CLI prompts to select or
   link your project.
5. Run **`📤 Supabase: Push Migrations`** to apply the repository migrations
   to the linked Supabase project.
6. Run **`🚀 Dev: Start All`** to start the frontend and API.

The seed files include 12 demo accounts that share the password `password123`
and generate projects, tasks, labels, and related test data. Only run the remote
seed task against a dedicated test project; never seed production or a shared
development database.

The Angular app is available at `http://localhost:4200`; the Express API is at
`http://localhost:3000`.

## Everyday development and checks

- **`🚀 Dev: Start All`** — start the frontend and backend together.
- **`🧪 Frontend: Tests (watch)`** — run frontend tests continuously.
- **`🧪 Backend: Tests (watch)`** — run backend tests continuously.
- **`🧪 Frontend: Tests (run once)`** and
  **`🧪 Backend: Tests (run once)`** — run the selected suite once.
- **`✅ CI: Verify All`** — run both test suites, both linters, the repository
  format check, and both builds.
- **`🔎 Backend: Typecheck`** — type-check the Express API.
- **`🎨 Format: Check`** — check formatting; **`🎨 Format: Fix`** applies
  formatting.

Run **`✅ CI: Verify All`** after configuring the environment files. Individual
frontend test and build tasks also use the values in `frontend/.env`.

## Local test database

Backend integration tests can use the local Supabase stack managed by Docker;
running them locally does not require a remote test project. Docker Desktop must
be running, and the Supabase CLI is installed with the root npm dependencies.

### Start and configure

1. Start Docker Desktop and wait for its engine to be ready.
2. Run **`🐳 Supabase: Start Local DB`**. On the first run, Docker downloads the
   Supabase images. The stack uses ports configured in `supabase/config.toml`.
3. Run **`📊 Supabase: Local Status`** to view the local API URL, service-role
   key, and database URL.

Set these values in `backend/.env`:

- `SUPABASE_TEST_URL`: API URL, usually `http://127.0.0.1:55321`.
- `SUPABASE_TEST_SERVICE_ROLE_KEY`: the local service-role key from status.
- `SUPABASE_TEST_DATABASE_URL` and `SUPABASE_TEST_DIRECT_URL`: the local
  database URL, usually `postgresql://postgres:postgres@127.0.0.1:55432/postgres`.

Keep the regular `SUPABASE_URL`, `DATABASE_URL`, and `DIRECT_URL` values as
configured for normal development. Never put a hosted URL in any
`SUPABASE_TEST_*` URL: integration tests create and delete accounts, and the
test harness refuses non-local test targets.

### Reset, seed, and stop

1. Run **`🔄 Supabase: Reset Local DB`** to rebuild the local database from
   `supabase/migrations/` without seed data. This permanently deletes existing
   local database contents.
2. Run **`🌱 Supabase: Seed Local DB`** to apply the SQL files in
   `supabase/seeds/` without resetting the database. Seed before E2E and
   regression tests that need demo fixtures.
3. Run `npm --prefix backend run test:integration`. If tests report that they
   were skipped, check the three `SUPABASE_TEST_*` values above.
4. At the end of the day, run **`⏹️ Supabase: Stop Local DB`**. This keeps local
   data. To clear all local data and volumes, use the Supabase CLI's
   `supabase stop --no-backup` command.

Use **`📥 Supabase: Pull Remote State`** only when you intentionally want to
pull schema from the linked hosted project into a migration file. It does not
pull database rows and is not part of local database setup. Review generated
migrations before committing them. Local schema is rebuilt from the repository
migrations; never use a linked/remote reset or push command for local testing.

For remote fixtures, **`🌱 Supabase: Seed Remote`** applies seed SQL without
resetting the linked database. **`⚠️ Supabase: Reset REMOTE DB (destructive)`**
resets the linked database and reapplies migrations without seed data. Confirm
the linked project and use the reset only for a dedicated disposable test
project, never production or shared development data.

## Browser E2E tests

The shared Playwright runner exercises registration, login/session handling,
password recovery, profile management, and Projects (create, edit, delete,
favorite, archive, reorder, and switch), Tasks, and the Dashboard against the
local frontend and API. Specs live in `tests/e2e/auth/`, `tests/e2e/projects/`,
`tests/e2e/tasks/`, `tests/e2e/dashboard/`, `tests/e2e/organization/`,
`tests/e2e/settings/`, `tests/e2e/archive/`, `tests/e2e/search/`,
`tests/e2e/streaks/` and `tests/e2e/views/`.
By default, it starts local Supabase and uses its seeded database. It forces the
backend console mailer and does not read or connect to a linked/remote project.

Prerequisites:

- Docker Desktop is installed and running, and the local Supabase stack is
  started.
- Root, frontend, and backend npm dependencies are installed.
- The local Supabase database has the repository migrations and seed data. Use
  the local reset and seed tasks above if it needs to be rebuilt.
- Install the Playwright Chromium browser once with
  `npx playwright install chromium`.
- Regenerate the backend Prisma client after pulling schema changes. The runner
  starts the backend directly, so it does not do this for you, and an old client
  makes task requests fail with 500 ("reading 'findMany'"). `prisma:generate`
  needs `DATABASE_URL` and `DIRECT_URL`; with local Supabase, from PowerShell:

  ```powershell
  $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:55432/postgres'
  $env:DIRECT_URL = $env:DATABASE_URL
  npm --prefix backend run prisma:generate
  Remove-Item Env:DATABASE_URL, Env:DIRECT_URL
  ```

- Apply any migrations the local database is missing, without resetting it,
  with `npx supabase migration up --local`, then seed again.
- If the runner cannot reach local Supabase (`ECONNREFUSED 127.0.0.1:55321`) or
  `supabase start` fails with "ports are not available … access permissions",
  Windows has reserved the 55xxx ports (check with
  `netsh interface ipv4 show excludedportrange protocol=tcp`). From an
  administrator PowerShell run `net stop winnat; net start winnat`, then
  `npx supabase start`. Local data is kept.

Run `npm run test:e2e` from the repository root, or choose
**`🧪 E2E: Tests (run once)`** in VS Code. The runner starts the frontend at
`http://localhost:4200` and API at `http://localhost:3000`, then stops both
when the suite completes. Supabase remains running so you can run the command
again against the same database. No real email is sent. Created test users are
deleted and seeded user profiles, passwords, sessions, and reset tokens are
restored after each relevant test and again at suite teardown.

The Projects specs sign in as the seeded `harvey` account (and use `james` to
check that one user's project is hidden from another). Projects they create are
named `E2E …` and removed from the database after each test; any left by an
aborted run are removed before the next one. Harvey's seeded projects get their
favorite, archive, and sort-order values put back through the API after each
test, and the test fails if they differ from the seed afterwards.

The Dashboard specs in `tests/e2e/dashboard/` (`current-upcoming.e2e.spec.ts`
and `overdue.e2e.spec.ts`) check the Current & Upcoming and Overdue sections of
`/dashboard` against service-role database queries. They use Harvey's
`Filter fixture …` tasks from `supabase/seeds/006_filtering.sql`, whose due dates
and deadlines are relative to the day the seed ran. Seeding again does not move
those dates, so **run the Dashboard specs on a database seeded the same day**:

```powershell
npm run supabase:local:reset   # deletes local data
npm run supabase:local:seed
npm run test:e2e -- dashboard/
```

Each spec stops with a clear message if the seed is missing or more than one
day old. Tasks completed during a test, and any next occurrences created for
recurring tasks, are put back after each test. Freshly created accounts are
deleted.

The five Sprint 5 specs sign in as `harvey`, and use `alex` or `james` as the
other user:

- `organization/sort-filter.e2e.spec.ts` filters Harvey's `Filtering - Client Work`
  project (seed `006_filtering.sql`) by two priorities and a label, sorts by
  deadline, reloads, and clears; the shown tasks are checked against a
  service-role query. It also filters `/projects` to favorites sorted by name.
- `settings/labels-priorities.e2e.spec.ts` creates, reorders, defaults and
  deletes an "Urgent" level, and creates, renames, reorders and deletes a label.
- `settings/settings.e2e.spec.ts` saves dashboard limits of 3 tasks and 4
  projects and checks every widget at desktop and mobile widths, then saves
  Large and Serif and checks them after a reload and a fresh sign-in.
- `archive/archive.e2e.spec.ts` archives a task (with Undo), the Review label
  and the Weekly Notes project, checks them on `/archive` and in their usual
  places, opens the archived task read-only, and restores each one. It also
  checks that James's archived items never appear (seed `009_archiving.sql`).
- `search/search.e2e.spec.ts` uses Ctrl/Cmd+K to search Harvey's fixtures
  (seed `010_search.sql`) by title, description and project name, opens results
  from the keyboard, and checks ranking, Include archived, the empty state and
  that James's tasks never appear.

Everything these specs change (priority levels, label order, settings,
archived tasks, labels and projects, created tasks and labels) is written back
after each test, and the test fails if
Harvey's seeded rows differ afterwards. They do not depend on the day the seed
ran, but they need the archive and search seeds (`009` and `010`), so seed the
local database first. Run all five, headless, twice in a row with:

```powershell
npm run test:e2e -- organization/ settings/ archive/ search/ --repeat-each=2
```

The five Sprint 6 specs sign in as `james` (streaks, reordering, the board) or
`harvey` (views, timeline) and use the Sprint 6 seeds (`011_task_positions.sql`
to `014_board_status.sql`):

- `streaks/streaks.e2e.spec.ts` shows the seeded daily task's 4-day streak,
  completes today's occurrence from the Table view and checks 5 days, the next
  occurrence due tomorrow, the task's streak detail and the dashboard's
  Streaks section. A seeded series that missed a day shows no current streak
  and its longest streak of 7 days.
- `organization/reorder.e2e.spec.ts` drags the third task of
  `Reorder - Project One` to the top in Default order, moves tasks with the
  Move buttons and Alt+Arrow keys, and drags `Reorder - Project Two` above
  `Reorder - Project One` in the project organizer, reloading after each.
- `views/views.e2e.spec.ts` filters `Timeline - Work` to Active tasks and
  checks the same tasks in List, Table, Board and Timeline, sorts the table by
  Title both ways, and checks that the chosen view comes back after a reload
  and when the URL names none.
- `views/kanban.e2e.spec.ts` drags a `Board Status - Project` card from To Do
  to In Progress and Done, checks it under Completed in the List view, then
  drags it back to To Do and checks it is active again.
- `views/timeline.e2e.spec.ts` checks that the spanning `Timeline - Personal`
  bars start and end on the right day columns in the week (cut at the week's
  edges), does the same in the month, and opens a task by clicking its bar.

Every task row, completion, next occurrence, board status and project order
they change is put back after each test, and the test fails if James's or
Harvey's seeded rows differ afterwards. The streak, views and timeline
fixtures are dated relative to the day the seed ran (re-seeding moves them to
the new day), so those specs stop with a clear message unless the database was
seeded today. Reset, seed, and run all five headless, twice in a row, with:

```powershell
npm run supabase:local:reset   # deletes local data
npm run supabase:local:seed
npm run test:e2e -- streaks/ organization/reorder views/ --repeat-each=2
```

Pass extra Playwright arguments after `--`:

```powershell
npm run test:e2e -- projects/                 # only the Projects specs
npm run test:e2e -- projects/project-crud     # one spec file
npm run test:e2e -- projects/ --repeat-each=2 # each Projects test twice in a row
npm run test:e2e -- dashboard/                # only the Dashboard specs
```

Failed-test screenshots, videos, and traces are saved under
`tests/e2e/test-results/` (ignored by Git). The backend's captured console-mail
output, including temporary reset links, is kept in an OS temporary directory
and deleted after the run.

To run E2E against a **dedicated, isolated remote Supabase test project** instead
of Docker, set its `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`,
`SUPABASE_TEST_SERVICE_ROLE_KEY`, and `SUPABASE_TEST_DATABASE_URL` in
`backend/.env`, then opt in explicitly from PowerShell:

```powershell
$env:E2E_SUPABASE_TARGET = 'remote-test'
npm run test:e2e
Remove-Item Env:E2E_SUPABASE_TARGET
```

`SUPABASE_TEST_DIRECT_URL` is optional; the runner uses the test database URL if
it is omitted. For older environment files, `TEST_DATABASE_URL` and
`TEST_DIRECT_URL` are accepted aliases. Remote E2E does **not** reset or seed the
database. Before running, ensure it already has the current migrations and the
E2E fixture accounts and reset-token rows from `supabase/seeds/`. The suite
creates/deletes temporary accounts and modifies then restores the seeded James
account's password, profile, sessions, and reset tokens, and Harvey's sessions
and project favorite, archive, and order state. It also needs Harvey's seeded
Inbox and "Client Projects" rows from `supabase/seeds/004_projects.sql`. Never point it at a
production or shared development project.

## Regression tests

**`🧪 Regression: Tests (run once)`** (or `npm run test:regression` from the
repository root) runs, in order: backend unit tests, backend integration tests,
all backend API regression specs under `tests/regression/`, frontend unit and
integration tests, then the frontend regression specs in
`frontend/src/app/features/auth/testing/regression`. E2E runs separately with
`npm run test:e2e` or the **`🧪 E2E: Tests (run once)`** task. The regression
runner prints a table of pass, fail and skip counts, saves it to
`reports/regression/summary.md` for the sprint regression log, and exits with
an error if any step fails, skips tests, or cannot run.

The backend integration tests use the local Supabase test stack. Set
`SUPABASE_TEST_URL`, `SUPABASE_TEST_SERVICE_ROLE_KEY`, and
`SUPABASE_TEST_DATABASE_URL` (and optionally `SUPABASE_TEST_DIRECT_URL`) in
`backend/.env`. The runner passes only these `SUPABASE_TEST_*` values from
`backend/.env` to the tests. CI starts Supabase locally and obtains these values
from the CLI.

Run only the frontend regression specs with `npm run test:regression` from
`frontend`.

## Supabase tasks

The task list has separate seed and reset tasks for local and remote databases.
The remote seed task updates fixture rows without resetting the linked database.
Verify the linked project and use it only for a dedicated test project, never
production or shared development data.
