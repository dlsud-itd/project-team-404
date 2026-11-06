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
     `BREVO_SENDER_NAME` (defaults to `HabitTracker`).

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
   `supabase/migrations/` without demo data. This permanently deletes the
   existing local database contents.
2. To load demo data, run **`🌱 Supabase: Seed Local DB`**. This applies the SQL
   files in `supabase/seeds/` without resetting the database. It also provides
   the demo fixtures needed by E2E and regression tests.
3. Run `npm --prefix backend run test:integration`. The full regression task
   also runs E2E tests against local Supabase. If tests report that they were
   skipped, check the three `SUPABASE_TEST_*` values above.
4. At the end of the day, run **`⏹️ Supabase: Stop Local DB`**. This keeps local
   data. To clear all local data and volumes, use the Supabase CLI's
   `supabase stop --no-backup` command.

Use **`📥 Supabase: Pull Remote State`** only when you intentionally want to
pull schema from the linked hosted project into a migration file. It does not
pull database rows and is not part of local database setup. Review generated
migrations before committing them. Local schema is rebuilt from the repository
migrations; never use a linked/remote reset or push command for local testing.

## Browser E2E tests

The shared Playwright runner exercises registration, login/session handling,
password recovery, profile management, and Projects (create, edit, delete,
favorite, archive, reorder, and switch) against the local frontend and API.
Specs live in `tests/e2e/auth/` and `tests/e2e/projects/`.
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

Pass extra Playwright arguments after `--`:

```powershell
npm run test:e2e -- projects/                 # only the Projects specs
npm run test:e2e -- projects/project-crud     # one spec file
npm run test:e2e -- projects/ --repeat-each=2 # each Projects test twice in a row
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

**`🔁 Regression: Run All`** (or `npm run test:regression` from the repository
root) runs, in order: backend unit tests, backend integration tests, the
Project CRUD and organization API regression specs, frontend unit and
integration tests, E2E tests, then the frontend regression specs in
`frontend/src/testing/regression`. It runs every step, prints a table of pass,
fail and skip counts, and saves it to `reports/regression/summary.md` for the
sprint regression log. It exits with an error if any step fails, skips tests,
or cannot run.

The backend integration tests need an isolated Supabase test project, never the
development project. Set `SUPABASE_TEST_URL`, `SUPABASE_TEST_SERVICE_ROLE_KEY`
and `SUPABASE_TEST_DATABASE_URL` (and optionally `SUPABASE_TEST_DIRECT_URL`) in
your shell or in `backend/.env`. The runner passes only these `SUPABASE_TEST_*`
values from `backend/.env` to the tests. In CI the same names are repository
secrets used by the Backend Tests job.

Run only the frontend regression specs with `npm run test:regression` from
`frontend`.

## Supabase tasks

The task list also includes tasks to check migration status, pull remote state,
seed the linked remote database, and reset databases. Confirm the selected
Supabase project before using any remote operation. The task
**`⚠️ Supabase: Reset REMOTE DB (destructive)`** resets the linked remote
database and is destructive.
