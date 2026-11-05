# Registration Postman Guide: Remote Supabase

This guide explains how to run the registration Postman collection against a **dedicated remote Supabase test project**. It assumes you are new to Postman and Supabase. You do not need Docker, and you must not start local Supabase.

## Can I run the collection all at once?

**Yes. Run the `260-registration` folder in Postman's Collection Runner with all 16 requests selected and in their listed order.** The collection generates unique signup values, saves the new user's IDs and login token, and uses those values in later requests. There are no manual pauses or tokens to copy.

## Important safety warning

Use a **dedicated, isolated Supabase project for testing**. Do not use production, a teammate's project, or a shared development project. The first request creates a real Supabase Auth user, profile, and Inbox through the API. Each collection run generates a new username and email, so these rows remain in the project after the run; the collection does not clean them up.

Never run **Supabase: Reset REMOTE DB (destructive)** for this guide. It drops and recreates the linked remote database. Use **Supabase: Seed Remote (no reset)** to ensure the seeded accounts and fixtures exist. That task does not reset the database, but it does create or update its configured fixture rows.

## What the collection uses

The collection checks username and email conflicts against James's seeded account and creates a separate new account. The seeded users come from `supabase/seeds/001_users.sql`:

| Account | Email | Username | Password |
| --- | --- | --- | --- |
| James | `james@example.com` | `james` | `password123` |
| Harvey | `harvey@example.com` | `harvey` | `password123` |
| Alex | `alex@example.com` | `alex` | `password123` |

The new account uses a generated username and email, plus the test password `PostmanPass123`. The collection logs in with those credentials and checks that signup created exactly one default Inbox.

## Before you begin

You need:

- This repository open in VS Code.
- Postman installed and open.
- Node.js and npm installed. The repository expects Node.js 22 or later.
- Access to a dedicated Supabase test project, including its project URL, server-side key, and database connection string.

**Docker Desktop is not needed.** Do not run `npx supabase start` or `npx supabase db reset --local` for this workflow.

If the repository dependencies have not been installed, open VS Code's Command Palette with `Ctrl+Shift+P`, choose **Tasks: Run Task**, and run **📦 Install All Dependencies**. Wait for it to finish before continuing.

## 1. Confirm the remote test project

Before running commands that affect Supabase, identify the project you intend to use.

1. Sign in to the Supabase Dashboard in your browser.
2. Open the dedicated test project, not the production or shared development project.
3. Note its project name and project reference. The reference is the short identifier in the project's URL and settings.
4. Keep that project open so you can compare it with the project linked to the Supabase CLI and configured in `backend/.env`.

The CLI and backend must both target this same test project. If you cannot confidently identify it, stop before pushing migrations or seeding data.

## 2. Sign in and link the Supabase CLI

1. In VS Code, choose **Terminal > New Terminal** from the top menu.
2. Check that the terminal is at the repository root. Its path should end in `project-team-404`, the folder that contains `package.json` and `supabase`. If it is somewhere else, enter:

   ```powershell
   cd C:\Users\Matthew\source\repos\project-team-404
   ```

3. Open VS Code's Command Palette with `Ctrl+Shift+P`, choose **Tasks: Run Task**, and run **🔐 Supabase: Login**. Follow the browser sign-in and authorization steps.
4. Run **🔗 Supabase: Link Project** from the same task menu. Select the dedicated test project confirmed in step 1. Check the project name/reference shown by the CLI before confirming.
5. If the CLI asks for the database password, enter the password for this test project directly into the terminal prompt. Do not paste it into Postman, this guide, or a chat.

## 3. Apply remote migrations and seed the fixtures

1. Run **📊 Supabase: Check Migration Status** from **Tasks: Run Task**. Confirm that the CLI is checking the intended test project.
2. If repository migrations are pending, run **📤 Supabase: Push Migrations**. Review any CLI prompt carefully. If it proposes resetting or destructively replacing the database, cancel and ask the project owner before proceeding.
3. Run **🌱 Supabase: Seed Remote (no reset)**. This task executes each seed file against the linked remote project and reports the SQL execution result as `SUCCEEDED` or `ERROR`:
   - `001_users.sql`
   - `002_inbox_projects.sql`
   - `003_password_reset_tokens.sql`
   - `004_projects.sql`
   - `005_tasks.sql`
4. If any seed reports `ERROR`, stop and read the output before using Postman. Do not use the destructive remote reset task to get past a seed error.

The seeded account password is `password123`. Keep the test project isolated because the seed task updates real remote fixture rows.

## 4. Configure the local backend for the remote project

Postman calls the Express API running on your computer. The local API connects to the remote Supabase project. You do not need to deploy the API or enter Supabase credentials in Postman.

1. In VS Code's Explorer, expand `backend` and open `backend/.env`. If the file does not exist, run **🛠️ Setup: Create Environment Files** from **Tasks: Run Task**.
2. In the Supabase Dashboard for the same test project, find its API URL, server-side secret/service-role key, and PostgreSQL connection URI.
3. Set these entries in `backend/.env`:

   | Variable | Value to use |
   | --- | --- |
   | `SUPABASE_URL` | The remote test project's API URL. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Its server-side secret/service-role key, not the publishable/anon key. |
   | `DATABASE_URL` | Its PostgreSQL connection URI for the backend. |
   | `DIRECT_URL` | The project's direct PostgreSQL connection URI, following the Supabase Dashboard's connection guidance. |
   | `NODE_ENV` | `development` |
   | `PORT` | `3000` |
   | `WEB_APP_URL` | `http://localhost:4200` |
   | `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` |

   Use the connection strings shown by the Supabase Dashboard, not the placeholders in `backend/.env.example`. The database URI contains a password; keep it private. The API URL, service key, and database URI must all refer to the same test project.
4. Do not put the remote secret key or database URI in Postman. Keep them only in the private backend `.env` file. Do not commit or share that file.
5. Save `backend/.env`. If the backend is already running, stop it in its terminal with `Ctrl+C` and restart it so it loads the new values.

The `SUPABASE_TEST_*` variables in the example file are for automated integration/E2E runners. These manual Postman requests use `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` from `backend/.env`.

## 5. Start the frontend and API

1. In VS Code, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, and select **🚀 Dev: Start All**. This starts the frontend and backend in parallel.
2. Keep the task running while using Postman. Wait for the backend terminal to report that the server is listening on port `3000`; the frontend runs on port `4200`.
3. Open this address in a browser to check that the local API is running:

   ```text
   http://localhost:3000/health
   ```

## 6. Import the Postman collection and environment

The folder contains two JSON files:

- `Project-Team-404 API - 260-registration.postman_collection.json`
- `Project-Team-404 Local (260-registration).postman_environment.json`

The collection contains requests and assertions. The environment contains values referenced by those requests, such as `baseUrl` and the seeded account credentials.

1. In Postman, open the workspace where you want these tests. The left sidebar has sections such as **Collections** and **Environments**.
2. Open Windows File Explorer and navigate to:

   ```text
   C:\Users\Matthew\source\repos\project-team-404\tests\postman\260-registration
   ```

3. Select both JSON files. Click the collection JSON file, then hold `Ctrl` and click the environment JSON file so both are selected.
4. Drag both selected files from File Explorer into the main Postman window and drop them. Postman should show an import preview. Confirm the import.

   Alternatively, click **Import** in Postman, choose **Files**, browse to the folder above, select both JSON files, and confirm.
5. Confirm that the left sidebar shows **Project-Team-404 API - 260-registration** under **Collections** and **Project-Team-404 Local (260-registration)** under **Environments**.

## 7. Select and check the Postman environment

These requests use the **environment**. It is normal if the collection's **Variables** tab is empty.

1. In Postman's environment selector, choose **Project-Team-404 Local (260-registration)**.
2. Open that environment's variables and check the **Current value** column:

   | Variable | Expected value or action |
   | --- | --- |
   | `baseUrl` | `http://localhost:3000/api` |
   | `seedPassword` | `password123` |
   | `jamesEmail` | `james@example.com` |
   | `harveyEmail` | `harvey@example.com` |
   | `alexEmail` | `alex@example.com` |
   | `signupPassword` | `PostmanPass123` |
   | `newUsername`, `uniqueEmail` | Generated by the first request before each run. |
   | `availableUsername`, `availableEmail` | Generated by the first request before each run. |
   | `registeredUserId`, `registeredInboxId`, `token` | Leave blank; successful requests populate them. |

3. If `baseUrl` is different, set its current value to `http://localhost:3000/api`. This is the local API URL, not the remote Supabase URL.
4. Do not manually fill in generated values. Save the environment if Postman shows a **Save** button or unsaved-changes indicator; some versions save automatically.

## 8. Run all requests at once in Postman Runner

1. Confirm the backend terminal is still running and **Project-Team-404 Local (260-registration)** is selected in Postman's environment selector.
2. In the left sidebar, find **Project-Team-404 API - 260-registration** and click its **Run** button. If it is not visible, click the collection's `...` menu and choose **Run**.
3. In Collection Runner, select the `260-registration` folder if prompted. Keep all 16 requests selected and in their existing order.
4. Confirm the environment is **Project-Team-404 Local (260-registration)**, then click **Run 260-registration** (or the equivalent **Run** button in your Postman version).
5. Wait for the run to finish and review the summary. Every assertion should pass. Some requests are expected to return `400` or `409`; those are valid negative tests when Postman marks their assertions as passed.

The collection generates a unique username and email before its first request, captures the new user and Inbox IDs from signup, and saves the login token later. Do not reorder or skip the first request.

## 9. Request order and expected results

Use this order if sending requests individually. Requests that depend on generated values must follow the signup request.

| Order | Request | Expected result or action |
| ---: | --- | --- |
| 1 | Register a new user and Inbox | `201`; creates an account and saves its user and Inbox IDs. |
| 2 | Duplicate seeded username returns 409 | `409`; James's username is already taken. |
| 3 | Duplicate seeded email returns 409 | `409`; James's email is already taken. |
| 4 | Password shorter than 8 characters returns 400 | `400`. |
| 5 | Confirm password mismatch returns 400 | `400`. |
| 6 | Invalid email format returns 400 | `400`. |
| 7 | Username over 50 characters returns 400 | `400`. |
| 8 | Invalid timezone returns 400 | `400`. |
| 9 | Unused username is available | `200`; `available` is `true`. |
| 10 | Seeded username is unavailable | `200`; `available` is `false`. |
| 11 | Username over 50 characters is rejected | `400`. |
| 12 | Unused email is available | `200`; `available` is `true`. |
| 13 | Seeded email is unavailable | `200`; `available` is `false`. |
| 14 | Invalid email format is rejected | `400`. |
| 15 | Login with newly registered user | `200`; saves the login token and checks the new credentials. |
| 16 | Registered user has exactly one default Inbox | `200`; confirms one Inbox and checks its ID against signup. |

Each complete run creates another account and Inbox in the selected remote project. There is no cleanup request; use only the isolated test project.
