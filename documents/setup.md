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

## Regression tests

**`🔁 Regression: Run All`** (or `npm run test:regression` from the repository
root) runs, in order: backend unit tests, backend integration tests, frontend
unit and integration tests, E2E tests, then the frontend regression specs in
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
