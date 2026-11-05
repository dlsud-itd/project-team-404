# Current and Upcoming Tasks Postman Guide: Remote Supabase

This guide explains how to run the current/upcoming tasks Postman collection against a **dedicated remote Supabase test project**. It assumes you are new to Postman and Supabase. You do not need Docker, and you must not start local Supabase.

## Can I run the collection all at once?

**Yes. Run all 45 requests in the `340-current-upcoming-tasks` folder in one Collection Runner session.** The first requests log in, change Harvey's timezone for the timezone checks, create task/project fixtures, and create or reuse an isolated account for the empty-result case. Later requests use tokens and IDs captured automatically in the selected environment.

Do not reorder or skip the setup requests. Later requests depend on values generated earlier in the folder. Run the collection from the beginning each time so it generates a fresh `runId` and recalculates the date-relative fixtures.

## Important safety warning

Use a **dedicated, isolated Supabase project for testing**. Do not use production, a teammate's project, or a shared development project. The collection creates projects and tasks; some tasks are soft-deleted, but created rows are not fully cleaned up. Repeated runs add more test rows.

The collection temporarily changes Harvey's profile timezone and restores the captured value in its final request. If a run stops before cleanup, restore the original timezone manually using the Profile API before using that account elsewhere.

Never run **Supabase: Reset REMOTE DB (destructive)** for this guide. It drops and recreates the linked remote database. Use **Supabase: Seed Remote (no reset)** for shared fixtures; it does not reset the whole database.

## What the collection uses

The collection logs in as James and Harvey, created by `supabase/seeds/001_users.sql`:

| Account | Email | Password |
| --- | --- | --- |
| James | `james@example.com` | `password123` |
| Harvey | `harvey@example.com` | `password123` |

The empty-result case uses a separate `dashboardempty340@example.com` account with password `PostmanPass123`. The collection creates it on the first run and reuses it on later runs; do not add tasks to this account. James is expected to use `Asia/Manila`. Harvey is temporarily set to the configured far-west timezone (`Etc/GMT+12`) and restored at the end of the run. The backend reads records from PostgreSQL and checks credentials through Supabase Auth, so `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` must refer to the **same test project**.

The collection-level pre-request script derives `YYYY-MM-DD` fixtures from the current instant in each user's timezone. This keeps today's, tomorrow's, window-boundary, and past-due cases current whenever the folder is run.

## Before you begin

You need VS Code, Postman, Node.js 22 or later, and access to a dedicated remote Supabase test project. Docker Desktop is not needed. If repository dependencies are not installed, run **📦 Install All Dependencies** from **Tasks: Run Task**.

## 1. Link and prepare the remote test project

1. Sign in to the Supabase Dashboard and open the dedicated test project. Note its name and project reference. Do not continue if you cannot distinguish it from production or shared development.
2. In VS Code, choose **Terminal > New Terminal**. Confirm that the terminal is at the repository root, the folder containing `package.json` and `supabase`.
3. Open the Command Palette with `Ctrl+Shift+P`, choose **Tasks: Run Task**, and run **🔐 Supabase: Login**. Follow the browser sign-in steps.
4. Run **🔗 Supabase: Link Project**. Select the dedicated test project and verify its name/reference before confirming. Enter its database password directly into the terminal if prompted; do not put it in Postman or a checked-in file.
5. Run **📊 Supabase: Check Migration Status**. If repository migrations are pending, run **📤 Supabase: Push Migrations**. If the CLI suggests destructive reset/replacement, cancel and confirm with the project owner.
6. Run **🌱 Supabase: Seed Remote (no reset)**. Each seed file runs against the linked project and reports `SUCCEEDED` or `ERROR` based on SQL execution. Stop if any seed reports `ERROR`.

The seed task is not a full database reset. It sets the seeded users' passwords to `password123` and updates fixtures. Run it only against the dedicated test project.

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

- `Project-Team-404 API - 340-current-upcoming-tasks.postman_collection.json`
- `Project-Team-404 Local (340-current-upcoming-tasks).postman_environment.json`

1. Open Postman and choose your workspace.
2. In Windows File Explorer, open `tests/postman/340-current-upcoming-tasks` in the repository.
3. Select both JSON files and drag them into the Postman window. Confirm the import preview. Alternatively, click **Import**, choose **Files**, select both files, and confirm.
4. Confirm the collection and environment appear as **Project-Team-404 API - 340-current-upcoming-tasks** and **Project-Team-404 Local (340-current-upcoming-tasks)**.

## 5. Select and check the environment

The collection's **Variables** tab may be empty; its requests use the selected environment.

1. Click the environment selector near Postman's upper-right corner and select **Project-Team-404 Local (340-current-upcoming-tasks)**. Confirm it has a check mark under **Environments** in the left sidebar.
2. Check these values in the environment's **Current value** column:

	| Variable | Expected value/action |
	| --- | --- |
	| `baseUrl` | `http://localhost:3000/api` |
	| `token`, `tokenB` | Leave blank; login requests set them. |
	| `defaultDays`, `maxDays` | Currently `7` and `30`; see the contract note below. |
	| `westTimeZone` | `Etc/GMT+12`; the collection temporarily applies this to Harvey. |
	| Date and ID variables | Leave blank; the pre-request script and setup requests set them. |

3. If `baseUrl` differs, set it to `http://localhost:3000/api`. This is the local API address, not the remote Supabase URL.
4. Do not manually fill generated values. Save the environment if Postman shows a **Save** button or unsaved-changes indicator.

## 6. Run all requests in Collection Runner

1. Confirm the backend is running and **Project-Team-404 Local (340-current-upcoming-tasks)** is selected.
2. In the **Collections** sidebar, expand **Project-Team-404 API - 340-current-upcoming-tasks**.
3. Click the collection's **Run** button or choose **Run** from its `...` menu.
4. In Collection Runner, select all 43 requests in the `340-current-upcoming-tasks` folder, keep their existing order, and confirm the 340 environment.
5. Click **Run 340-current-upcoming-tasks** (or the equivalent **Run** button in your Postman version). Wait for the summary.

Some requests are expected to return `400` or `401`. They pass when the status and response-body assertions in each request's **Tests** tab pass.

### Send requests one at a time for troubleshooting

Expand the collection folder, click a request, and click **Send**. Keep the same environment selected. Run both login requests before setup; do not run a case request until its setup requests have passed.

## 7. Request order and expected results

| Order | Request | Expected result/action |
| ---: | --- | --- |
| 1 | Login - James (token, Asia/Manila) | `200`; sets `token` and `runId`. |
| 2 | Login - Harvey (tokenB, far-west profile) | `200`; sets `tokenB` and captures the original timezone. |
| 3 | Setup - Set Harvey to far-west timezone | `200`; applies `westTimeZone`. |
| 4 | Setup - Create archived project | `201`; captures project ID. |
| 5 | Setup - Create task due today (Manila) | `201`; captures today's task ID. |
| 6 | Setup - Create task due tomorrow | `201`; captures tomorrow's task ID. |
| 7 | Setup - Create task due on default window's last day | `201`; captures the default boundary task ID. |
| 8 | Setup - Create task due on maximum window's last day | `201`; captures the maximum boundary task ID. |
| 9 | Setup - Create task due after the default window | `201`; captures the outside-window task ID. |
| 10 | Setup - Create task due after the maximum window | `201`; captures the outside-maximum task ID. |
| 11 | Setup - Create past-due task | `201`; captures the past-due task ID. |
| 12 | Setup - Create task with no due date | `201`; captures the undated task ID. |
| 13 | Setup - Create completed task due today | `201`; captures the completed task ID. |
| 14 | Setup - Create task in archived project | `201`; captures the archived-project task ID. |
| 15 | Setup - Archive project | `200`; confirms `isArchived=true`. |
| 16 | Setup - Create task to soft-delete | `201`; captures the task ID. |
| 17 | Setup - Soft-delete task | `200`; soft-deletes the task. |
| 18 | Setup - Create Harvey-owned task due today | `201`; captures the other-user task ID. |
| 19 | Setup - Create Manila task due on Harvey's local date | `201`; captures the timezone comparison task ID. |
| 20 | Setup - Create Harvey task due on his local date | `201`; captures Harvey's local-today task ID. |
| 21 | Case - Due today is returned by default | `200`; includes today's task. |
| 22 | Case - Due tomorrow is returned | `200`; includes tomorrow's task. |
| 23 | Case - Default window last day is included | `200`; includes the default boundary task. |
| 24 | Case - Maximum window last day is included | `200`; includes the maximum boundary task. |
| 25 | Case - Day after default window is excluded | `200`; excludes the task after the default boundary. |
| 26 | Case - Day after maximum window is excluded | `200`; excludes the task after the maximum boundary. |
| 27 | Case - Past-due task is excluded | `200`; excludes the past-due task. |
| 28 | Case - Task with no due date is excluded | `200`; excludes the undated task. |
| 29 | Case - Completed task is excluded | `200`; excludes the completed task. |
| 30 | Case - Task in archived project is excluded | `200`; excludes the archived-project task. |
| 31 | Case - Soft-deleted task is excluded | `200`; excludes the deleted task. |
| 32 | Case - Only caller's tasks are returned | `200`; includes James's task and excludes Harvey's task. |
| 33 | Case - Same instant uses Manila local date | `200`; checks the Manila date boundary. |
| 34 | Case - Same instant uses far-west local date | `200`; includes Harvey's local-today task. |
| 35 | Setup - Soft-delete Harvey timezone fixtures | `200`; soft-deletes the ownership fixture. |
| 36 | Setup - Soft-delete Harvey far-west date fixture | `200`; soft-deletes the timezone fixture. |
| 37 | Setup - Ensure clean empty-result account | `201` on first run or `409` if it already exists. |
| 38 | Setup - Login empty-result account | `200`; captures `emptyUserToken`. |
| 39 | Case - User with no matching tasks gets empty result | `200`; returns the empty task shape. |
| 40 | Case - days=0 returns 400 | `400`. |
| 41 | Case - Negative days returns 400 | `400`. |
| 42 | Case - Days above maximum returns 400 | `400`. |
| 43 | Case - Non-numeric days returns 400 | `400`. |
| 44 | Case - Current-upcoming route without token returns 401 | `401`. |
| 45 | Cleanup - Restore Harvey timezone | `200`; restores Harvey's original timezone. |

## 8. Contract values and run evidence

The checked-in Dashboard API Spec PDF (version 1.1) documents `GET /api/dashboard/tasks`, but does not document `/api/dashboard/current-upcoming-tasks`, the `days` parameter, the response shape, or the default/maximum day counts. This collection follows the requested current/upcoming route and accepts either an array response or an object with a `tasks` array. The environment values `defaultDays=7` and `maxDays=30` are assumptions; update them if the authoritative endpoint spec uses different values.

The Collection Runner/Newman result export and response screenshots are not included yet. Run the folder with the endpoint and database configured, then export the run report and save the response screenshots in this folder.

## 9. Data left behind and common failures

Created projects and tasks remain in the dedicated test project after a run. The empty-result test account remains too, but is reused on subsequent runs and should be kept task-free. Some tasks are soft-deleted. A stopped run may also leave Harvey's timezone set to the far-west value if it did not reach the final cleanup request.

| Postman result | Check this |
| --- | --- |
| Connection refused or no response | Confirm **🚀 Dev: Start All** is running and `baseUrl` is `http://localhost:3000/api`. |
| A seeded login returns `401` | Confirm the remote test project was seeded, the password is `password123`, and `SUPABASE_URL`/`DATABASE_URL` refer to the same project. |
| A request contains an empty task or project ID | Run the earlier login and setup requests first, in order. |
| A profile request fails | Confirm the selected environment has `tokenB` and the profile endpoint accepts the seeded user's timezone update. |
| Date-boundary assertions fail | Confirm the environment's `defaultDays` and `maxDays` match the endpoint contract and rerun from the first request. |
| A migration or seed task reports `ERROR` | Stop and inspect the CLI output and linked project. Do not use the destructive remote reset task. |
