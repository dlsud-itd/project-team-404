# Task CRUD Postman Guide: Remote Supabase

This guide explains how to run the Postman export in this folder against a **dedicated remote Supabase test project**. It assumes you are new to Postman and Supabase. You do not need Docker, and you must not start local Supabase.

## Can I run the collection all at once?
**Yes. Run all 42 requests in the 337 collection in one Collection Runner session.** Setup requests log in, create projects/tasks, and capture their returned IDs in the selected Postman environment. You do not need to copy IDs or tokens manually.

Do not reorder or skip the setup requests. If troubleshooting, send requests individually but start at the beginning and keep the order. Many later requests use variables produced by earlier requests.


## Important safety warning

Use a **dedicated, isolated Supabase project for testing**. Do not use production, a teammate's project, or a shared development project. These tests create real projects and tasks, soft-delete some of them, and do not clean up everything created. Repeated runs add more test rows.

Never run **supabase db reset --linked** for this guide. It drops and recreates the linked remote database. Use **Supabase: Seed Remote** for the shared fixtures; it does not reset the whole database, but it does create/update the seeded users and other seed data.

## What the collection uses

The collection logs in as James and Harvey, who are created by `supabase/seeds/001_users.sql`:

| Account | Email | Password |
| --- | --- | --- |
| James | `james@example.com` | `password123` |
| Harvey | `harvey@example.com` | `password123` |

Their Inbox projects come from `supabase/seeds/002_inbox_projects.sql`. Postman creates the additional projects and tasks used by this collection. The backend reads project/task rows from PostgreSQL and checks credentials through Supabase Auth, so `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` must all point to the **same test project**.

## Before you begin

You need VS Code, Postman, Node.js 22 or later, and access to a dedicated remote Supabase test project. Docker Desktop is not needed. If the repository dependencies are not installed, run **📦 Install All Dependencies** from **Tasks: Run Task**.

## 1. Link and prepare the remote test project

1. Sign in to the Supabase Dashboard and open the dedicated test project. Note its name and project reference. Do not continue if you cannot distinguish it from production or shared development.
2. In VS Code, choose **Terminal > New Terminal**. Confirm that the terminal is at the repository root, the folder containing `package.json` and `supabase`. If needed, enter:

   ```powershell
   cd C:\Users\Matthew\source\repos\project-team-404
   ```

3. Open the Command Palette with `Ctrl+Shift+P`, choose **Tasks: Run Task**, and run **🔐 Supabase: Login**. Follow the browser sign-in steps.
4. Run **🔗 Supabase: Link Project**. Select the dedicated test project and verify its name/reference before confirming. Enter its database password directly into the terminal if prompted; do not put it in Postman or a checked-in file.
5. Run **📊 Supabase: Check Migration Status**. If repository migrations are pending, run **📤 Supabase: Push Migrations**. If the CLI suggests destructive reset/replacement, cancel and confirm with the project owner.
6. Run **🌱 Supabase: Seed Remote**. Each seed file runs against the linked project and reports `SUCCEEDED` or `ERROR` based on SQL execution. Stop if any seed reports `ERROR`.

The seed task is not a full database reset. It sets the seeded users' passwords to `password123` and updates fixture rows. Run it only against the dedicated test project.

## 2. Configure the backend

Postman talks to the Express API on your computer. The API connects to the remote test project.

1. In VS Code's Explorer, open `backend/.env`. If it does not exist, run **🛠️ Setup: Create Environment Files** from **Tasks: Run Task**.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` to values for the same remote test project. Set `DIRECT_URL` to its direct database URI. Use the Supabase Dashboard values, not the example placeholders in `backend/.env.example`.
3. Set or confirm `NODE_ENV=development`, `PORT=3000`, `WEB_APP_URL=http://localhost:4200`, and `CORS_ALLOWED_ORIGINS=http://localhost:4200`.
4. These tests do not send email. If you have no other reason to configure Brevo, remove or comment out `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`. Do not leave empty assignments; the backend rejects supplied empty strings.
5. Save `backend/.env` with `Ctrl+S`. If the backend is already running, stop it with `Ctrl+C`; start it again in the next section.

Keep the service-role key and database URI private in `backend/.env`. Do not put them in the Postman environment. The `SUPABASE_TEST_*` variables are for automated test runners, not these manual Postman requests.

## 3. Start the frontend and API

1. In VS Code, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, and select **🚀 Dev: Start All**. This starts the frontend and backend in parallel.
2. Keep the task running while using Postman. Wait for the backend terminal to report that the server is listening on port `3000`; the frontend runs on port `4200`.
3. Open `http://localhost:3000/health` in a browser to confirm that the API is reachable.

## 4. Import the Postman files

This folder contains:

- `Project-Team-404 API - 337-task-crud.postman_collection.json`
- `Project-Team-404 Local (337-task-crud).postman_environment.json`

1. Open Postman and choose your workspace.
2. In Windows File Explorer, open:

   ```text
   C:\Users\Matthew\source\repos\project-team-404\tests\postman\337-task-crud
   ```

3. Select both JSON files: click one, hold `Ctrl`, and click the other.
4. Drag both files into the Postman window and drop them. Confirm the import preview. Alternatively, click **Import**, choose **Files**, select both files, and confirm.
5. In Postman's left sidebar, confirm the collection appears as **Project-Team-404 API - 337-task-crud** and the environment as **Project-Team-404 Local (337-task-crud)**.

## 5. Select and check the environment

The collection's **Variables** tab may be empty; its requests use the selected environment.

1. Click the environment selector near Postman's upper-right corner and select **Project-Team-404 Local (337-task-crud)**. Confirm it has a check mark under **Environments** in the left sidebar.
2. Open the environment variables and check **Current value**:

   | Variable | Expected value/action |
   | --- | --- |
   | `baseUrl` | `http://localhost:3000/api` |
   | `token`, `tokenB` | Leave blank; login requests set them. |
   | `projectId`, `projectId2`, `projectIdB`, `deletedProjectId` | Leave blank; project setup requests set them. |
   | `taskId`, `taskIdB`, `deleteTaskId`, `pageTaskId`, `pageTaskTwoId`, `completedTaskId` | Leave blank; task setup requests set them. |
   | `firstPageTaskId` | Leave blank; the task list request sets it. |
   | `missingProjectId`, `missingTaskId` | Keep `999999999`; these are deliberate nonexistent IDs for 404 tests. |

3. If `baseUrl` differs, set it to `http://localhost:3000/api`. This is the local API address, not the remote Supabase URL.
4. Do not fill the generated variables manually. Save the environment if Postman shows a **Save** button or unsaved-changes indicator.

If you imported the old combined 337/339 collection, remove that collection and environment from Postman. Import the separate 337 files from this folder and the 339 files from `tests/postman/339-task-organization`.

## 6. Run all requests in Collection Runner

1. Confirm the backend is running and the 337 environment is selected.
2. In Postman's **Collections** sidebar, find **Project-Team-404 API - 337-task-crud**.
3. Click **Run** on the collection, or click the collection's `...` menu and choose **Run**.
4. In Collection Runner, select all 42 requests and confirm the 337 environment.
5. Keep the requests in their existing order.
6. Click **Run 337-task-crud** (or the equivalent **Run** button in your Postman version). Wait for the run summary.

Some requests are expected to return `400`, `401`, `404`, `409`, or `204`. They are intended negative cases or soft-delete cases; the test passes when the response matches the expected status and assertions.

### Send requests one at a time for troubleshooting

To inspect a failing request individually, click it in the expanded collection and press **Send**. Keep the 337 environment selected and run preceding login/setup requests first.

## 7. Request order and expected results

### Request list: 42 requests

| Order | Request | Expected result/action |
| ---: | --- | --- |
| 1 | Login - James (token) | `200`; sets `token`. |
| 2 | Login - Harvey (tokenB) | `200`; sets `tokenB`. |
| 3 | Setup - Create James project | `201`; sets `projectId`. |
| 4 | Setup - Create second James project | `201`; sets `projectId2`. |
| 5 | Setup - Create Harvey project | `201`; sets `projectIdB`. |
| 6 | Setup - Create project to soft-delete | `201`; sets `deletedProjectId`. |
| 7 | Setup - Soft-delete project | `204`. |
| 8 | Create task in own project | `201`; sets `taskId`. |
| 9 | Setup - Create active task for paging | `201`; sets `pageTaskId`. |
| 10 | Setup - Create second active task for paging | `201`; sets `pageTaskTwoId`. |
| 11 | Setup - Create completed task | `201`; sets `completedTaskId`. |
| 12 | Setup - Create Harvey task | `201`; sets `taskIdB`. |
| 13 | Setup - Create task to soft-delete | `201`; sets `deleteTaskId`. |
| 14 | Create task with empty title returns 400 | `400`. |
| 15 | Create task with over-long title returns 400 | `400`. |
| 16 | Create task with invalid body returns 400 | `400`. |
| 17 | Create task with missing project returns 404 | `404`. |
| 18 | Create task with deleted project returns 404 | `404`. |
| 19 | Create task in another user project returns 404 | `404`. |
| 20 | Rejected project assignments create no tasks | `200`. |
| 21 | List active tasks filtered by project | `200`. |
| 22 | List completed tasks by status | `200`. |
| 23 | List tasks page one | `200`; captures the first page task ID. |
| 24 | List tasks page two | `200`. |
| 25 | Get own task returns 200 | `200`. |
| 26 | Get another user task returns 404 | `404`. |
| 27 | Get missing task returns 404 | `404`. |
| 28 | Get malformed task ID returns 400 | `400`. |
| 29 | Update task returns the API success message | `200`. |
| 30 | Updated title and description persist | `200`. |
| 31 | Move task to another owned project | `200`. |
| 32 | Move task to another user project is rejected | `404`. |
| 33 | Task remains in owned project after rejected move | `200`. |
| 34 | Delete task is a soft delete | `200`. |
| 35 | Soft-deleted task leaves the list | `200`. |
| 36 | Get soft-deleted task returns 404 | `404`. |
| 37 | Second delete returns 404 | `404`. |
| 38 | Create task without token returns 401 | `401`. |
| 39 | List tasks without token returns 401 | `401`. |
| 40 | Get task without token returns 401 | `401`. |
| 41 | Update task without token returns 401 | `401`. |
| 42 | Delete task without token returns 401 | `401`. |


## 8. Data left behind and common failures

The collection creates projects and tasks in the remote database. It soft-deletes some tasks and a project but does not remove every created row. Repeated runs add more test rows. Use only a dedicated test project.

| Postman result | Check this |
| --- | --- |
| Connection refused or no response | Confirm the backend is running and `baseUrl` is `http://localhost:3000/api`. |
| A seeded login returns `401` | Confirm the test project was seeded, the request password is `password123`, and `SUPABASE_URL`/`DATABASE_URL` target the same project. |
| A request URL contains an empty project/task ID | A setup request did not pass earlier in this collection. Run from the beginning and keep the request order. |
| The backend exits after removing Brevo | Remove/comment out Brevo settings instead of leaving empty assignments, then restart the backend. |
| A migration or seed task reports `ERROR` | Stop and inspect the CLI output and linked project. Do not use the destructive remote reset task. |

At the end, some test rows remain in the dedicated remote project. This collection does not change James's password and does not require manual restoration. Reseeding with **🌱 Supabase: Seed Remote** restores shared fixture values but does not delete accumulated CRUD test rows.
