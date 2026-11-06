# Overdue Tasks Postman Guide: Remote Supabase

This guide explains how to run the overdue-tasks Postman collection against a **dedicated remote Supabase test project**. It assumes you are new to Postman and Supabase. You do not need Docker, and you must not start local Supabase for this guide.

## Can I run the collection all at once?

**Yes. Run all 31 requests in the `341-overdue-tasks` folder in one Collection Runner session.** The requests log in as James and Harvey, create date-relative task fixtures and an archived project, register a fresh account for the empty-result case, run the behavior checks, then restore Harvey's original timezone.

Do not reorder or skip the setup requests. Later requests use tokens and IDs captured earlier in the folder. Run from the beginning. Before a rerun, clear the `runId` and `dateRunId` environment values so the collection generates fresh dates, unique signup credentials, and fixture names.

## Important safety warning

Use a **dedicated, isolated Supabase project for testing**. Do not use production, a teammate's project, or a shared development project. The collection creates a project, tasks, and a new user on every run. The records are not deleted at the end; some tasks are soft-deleted.

The collection temporarily changes Harvey's profile timezone and restores it in the final request. If a run stops before cleanup, restore his original timezone manually through the Profile API before using that account elsewhere.

Never run **supabase db reset --linked** for this guide. It drops and recreates the linked remote database. Use **Supabase: Seed Remote** only against the dedicated test project if its seeded accounts or fixtures need preparation.

## What the collection uses

The collection logs in as James and Harvey, created by `supabase/seeds/001_users.sql`:

| Account | Email | Password |
| --- | --- | --- |
| James | `james@example.com` | `password123` |
| Harvey | `harvey@example.com` | `password123` |

James is expected to use `Asia/Manila`. The collection captures Harvey's original timezone, temporarily changes it to `Etc/GMT+12`, and restores it at the end. The empty-result case registers a new account with a unique email and username for each run; its password is `PostmanPass123`.

The collection-level pre-request script calculates deadline instants from the current time. Its earlier-today fixture is anchored to the current Manila calendar day, including runs shortly after midnight. The backend reads records from PostgreSQL and checks credentials through Supabase Auth, so `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` must refer to the **same test project**.

The task schema stores `deadline` as an offset-aware instant. Therefore, the same instant has the same overdue status for Manila and far-west users when compared with the same current instant. The two timezone requests assert that consistent behavior; timezone alone cannot make one identical instant overdue for one account but not the other.

## Before you begin

You need VS Code, Postman, Node.js 22 or later, and access to a dedicated remote Supabase test project. Docker Desktop is not needed. If repository dependencies are not installed, run **📦 Install All Dependencies** from **Tasks: Run Task**.

## 1. Link and prepare the remote test project

1. Sign in to the Supabase Dashboard and open the dedicated test project. Note its name and project reference. Do not continue if you cannot distinguish it from production or shared development.
2. In VS Code, choose **Terminal > New Terminal**. Confirm that the terminal is at the repository root, the folder containing `package.json` and `supabase`.
3. Open the Command Palette with `Ctrl+Shift+P`, choose **Tasks: Run Task**, and run **🔐 Supabase: Login**. Follow the browser sign-in steps.
4. Run **🔗 Supabase: Link Project**. Select the dedicated test project and verify its name/reference before confirming. Enter its database password directly into the terminal if prompted; do not put it in Postman or a checked-in file.
5. Run **📊 Supabase: Check Migration Status**. If repository migrations are pending, run **📤 Supabase: Push Migrations**. If the CLI suggests destructive reset/replacement, cancel and confirm with the project owner.
6. Run **🌱 Supabase: Seed Remote**. Each seed file runs against the linked project and reports `SUCCEEDED` or `ERROR` based on SQL execution. Stop if any seed reports `ERROR`.

The seed task is not a full database reset. It sets seeded account passwords to `password123` and updates fixtures. Run it only against the dedicated test project.

## 2. Configure the backend

Postman calls the Express API running on your computer. The API connects to the remote test project.

1. In VS Code's Explorer, open `backend/.env`. If it does not exist, run **🛠️ Setup: Create Environment Files** from **Tasks: Run Task**.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` to values for the same remote test project. Set `DIRECT_URL` to its direct database URI. Use the Supabase Dashboard values, not the placeholders in `backend/.env.example`.
3. Set or confirm `NODE_ENV=development`, `PORT=3000`, `WEB_APP_URL=http://localhost:4200`, and `CORS_ALLOWED_ORIGINS=http://localhost:4200`.
4. These tests do not send email. If you have no other reason to configure Brevo, remove or comment out `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`. Do not leave empty assignments; the backend rejects supplied empty strings.
5. Save `backend/.env`. If the backend is already running, stop it with `Ctrl+C`; start it again in the next section.

Keep the service-role key and database URI private in `backend/.env`. Do not put them in the Postman environment. `SUPABASE_TEST_*` variables are for automated test runners, not these manual Postman requests.

## 3. Start the frontend and API

1. In VS Code, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, and select **🚀 Dev: Start All**. This starts the frontend and backend in parallel.
2. Keep the task running while using Postman. Wait for the backend terminal to report that the server is listening on port `3000`; the frontend runs on port `4200`.
3. Open `http://localhost:3000/health` in a browser to confirm that the API is reachable.

## 4. Import the Postman files

This folder contains:

- `Project-Team-404 API - 341-overdue-tasks.postman_collection.json`
- `Project-Team-404 Local (341-overdue-tasks).postman_environment.json`

1. Open Postman and choose your workspace.
2. In Windows File Explorer, open `tests/postman/341-overdue-tasks` in the repository.
3. Select both JSON files and drag them into the Postman window. Confirm the import preview. Alternatively, click **Import**, choose **Files**, select both files, and confirm.
4. Confirm the collection and environment appear as **Project-Team-404 API - 341-overdue-tasks** and **Project-Team-404 Local (341-overdue-tasks)**.

## 5. Select and check the environment

The collection's **Variables** tab may be empty; its requests use the selected environment.

1. Click the environment selector near Postman's upper-right corner and select **Project-Team-404 Local (341-overdue-tasks)**. Confirm it has a check mark under **Environments** in the left sidebar.
2. Check these values in the environment's **Current value** column:

   | Variable | Expected value/action |
   | --- | --- |
   | `baseUrl` | `http://localhost:3000/api` |
   | `token`, `tokenB`, `emptyToken` | Leave blank; login requests set them. |
   | `westTimeZone` | `Etc/GMT+12`; the collection temporarily applies this to Harvey. |
   | `runId`, `dateRunId` | Leave blank for the first run; clear both before each rerun. |
   | `harveyOriginalTimezone` | Leave blank; captured by Harvey's login request. |
   | Date, ID, email, and username variables | Leave blank; setup requests and the pre-request script set them. |

3. If `baseUrl` differs, set it to `http://localhost:3000/api`. This is the local API address, not the remote Supabase URL.
4. Do not manually fill generated values. Save the environment if Postman shows a **Save** button or unsaved-changes indicator.

## 6. Run all requests in Collection Runner

1. Confirm the backend is running and **Project-Team-404 Local (341-overdue-tasks)** is selected.
2. In the **Collections** sidebar, expand **Project-Team-404 API - 341-overdue-tasks**.
3. Click the collection's **Run** button or choose **Run** from its `...` menu.
4. In Collection Runner, select all 31 requests in the `341-overdue-tasks` folder, keep their existing order, and confirm the 341 environment.
5. Click **Run 341-overdue-tasks** (or the equivalent **Run** button in your Postman version). Wait for the summary.

Some requests are expected to return `400` or `401`. They pass when the status and response-body assertions in each request's **Tests** tab pass.

### Send requests one at a time for troubleshooting

Expand the collection folder, click a request, and click **Send**. Keep the same environment selected. Run both login requests before setup; do not run a case request until its setup requests have passed. Always run **Cleanup - Restore Harvey timezone** after the cases.

## 7. Request order and expected results

| Order | Request | Expected result/action |
| ---: | --- | --- |
| 1 | Login - James (token, Asia/Manila) | `200`; sets `token`. |
| 2 | Login - Harvey (tokenB) | `200`; sets `tokenB` and captures his original timezone. |
| 3 | Setup - Set Harvey to far-west timezone | `200`; applies `westTimeZone`. |
| 4 | Setup - Create archived project | `201`; captures project ID. |
| 5 | Setup - Create oldest overdue task | `201`; captures the oldest deadline fixture. |
| 6 | Setup - Create task due earlier today | `201`; captures a past deadline on today's Manila date. |
| 7 | Setup - Create task due later today or in future | `201`; captures a future deadline. |
| 8 | Setup - Create completed overdue task | `201`; captures a completed task with a past deadline. |
| 9 | Setup - Create task in archived project | `201`; captures a task for the archive fixture. |
| 10 | Setup - Archive project | `200`; confirms the project is archived. |
| 11 | Setup - Create task to soft-delete | `201`; captures a past-deadline task ID. |
| 12 | Setup - Soft-delete task | `200`; soft-deletes the task. |
| 13 | Setup - Create task without deadline | `201`; captures an undated task. |
| 14 | Setup - Create Harvey-owned task for timezone case | `201`; creates Harvey's task with the shared instant. |
| 15 | Setup - Create James task at the same deadline instant | `201`; creates James's task with the same instant. |
| 16 | Setup - Register a clean empty-result account | `201`; creates a unique account for this run. |
| 17 | Setup - Login empty-result account | `200`; sets `emptyToken`. |
| 18 | Case - Earlier today deadline is returned | `200`; includes the earlier-today fixture. |
| 19 | Case - Later today or future deadline is excluded | `200`; omits the future fixture. |
| 20 | Case - Results are ordered oldest deadline first | `200`; oldest fixture precedes the earlier-today fixture. |
| 21 | Case - Completed overdue task is excluded | `200`; omits the completed fixture. |
| 22 | Case - Task in archived project is excluded | `200`; omits the archived-project fixture. |
| 23 | Case - Soft-deleted task is excluded | `200`; omits the soft-deleted fixture. |
| 24 | Case - Task without deadline is excluded | `200`; omits the undated fixture. |
| 25 | Case - Only caller tasks are returned | `200`; includes James's fixture and omits Harvey's. |
| 26 | Case - Same instant is overdue for Manila account | `200`; includes James's task with the shared past instant. |
| 27 | Case - Same instant is overdue for far-west account | `200`; includes Harvey's task with that same instant. |
| 28 | Case - User with no overdue tasks gets empty result | `200`; returns `{ "tasks": [] }`. |
| 29 | Case - Invalid query value returns 400 | `400`; includes a validation error. |
| 30 | Case - Route without token returns 401 | `401`; returns the standard unauthorized error. |
| 31 | Cleanup - Restore Harvey timezone | `200`; restores his captured timezone. |

## 8. Run evidence

After the Collection Runner completes, export its run results to this folder as `341-overdue-tasks-run-results.json`. Capture a screenshot of each response and save the images in this folder with the matching request number and name, for example `18-earlier-today-deadline.png`. The collection and environment exports are already included; do not save access tokens or other secrets in the environment export.

## 9. Data left behind and common failures

Projects and tasks created during a run remain in the dedicated test project. Each run also registers a new empty-result account. Some task rows are soft-deleted. A stopped run may leave Harvey's timezone set to the far-west value if it did not reach the final cleanup request.

| Postman result | Check this |
| --- | --- |
| Connection refused or no response | Confirm **🚀 Dev: Start All** is running and `baseUrl` is `http://localhost:3000/api`. |
| A seeded login returns `401` | Confirm the remote test project was seeded, the password is `password123`, and `SUPABASE_URL`/`DATABASE_URL` refer to the same project. |
| A request contains an empty task or project ID | Run the earlier login and setup requests first, in order. |
| Signup returns a conflict | Clear `runId` and `dateRunId`, then start again from the first request. |
| A profile request fails | Confirm the selected environment has `tokenB` and the profile endpoint accepts the timezone update. |
| A deadline fixture is no longer relative to now | Clear `runId` and `dateRunId`, then rerun the folder from the beginning. |
| Harvey remains in the far-west timezone | Run the final cleanup request or restore his original timezone through the Profile API. |
| A migration or seed task reports `ERROR` | Stop and inspect the CLI output and linked project. Do not use the destructive remote reset task. |
