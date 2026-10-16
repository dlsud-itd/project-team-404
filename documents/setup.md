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
     `http://localhost:4200` for local development.

   The `NG_APP_` values are bundled into the browser application and must not
   contain secrets. The backend service-role key is privileged and must remain
   private; never put it in `frontend/.env`.

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

## Supabase tasks

The task list also includes tasks to check migration status, pull remote state,
seed the linked remote database, and reset databases. Confirm the selected
Supabase project before using any remote operation. The task
**`⚠️ Supabase: Reset REMOTE DB (destructive)`** resets the linked remote
database and is destructive.
