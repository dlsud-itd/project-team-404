# Task Timeline Postman Guide: Local API

This guide explains how to run the timeline collection against the local API and the relative-date fixtures seeded for Harvey.

## Can I run the collection all at once?

**Yes. Run all 13 requests in the `18-task-timeline` folder in one Collection Runner session.** The first two requests log in James and Harvey. The folder pre-request script calculates Harvey's current `Asia/Manila` date and the current Sunday-to-Saturday week. The baseline request captures the project ID used by a later filtered request.

Keep the requests in their existing order. The project-filter request depends on the baseline request, and all authenticated requests depend on the login requests.

## Important safety warning

Use a **disposable local database or dedicated isolated test project**. Do not point the collection at production or a shared development database. The collection only reads timeline data after login, but its assertions depend on the `013_timeline.sql` fixtures being present and current.

Do not use a destructive remote reset to prepare the collection. Apply migrations and seeds only to the intended test environment, and verify that the backend and Supabase Auth target the same environment.

## What the collection uses

The collection logs in as James and Harvey, created by `supabase/seeds/001_users.sql`:

| Account | Email | Password |
| --- | --- | --- |
| James | `james@example.com` | `password123` |
| Harvey | `harvey@example.com` | `password123` |

Harvey's relative-date tasks are created by `supabase/seeds/013_timeline.sql` across `Timeline - Work` and `Timeline - Personal`. The tests cover multi-day and single-day bars, bars crossing both sides of the requested week, undated counts, completion, filters, user isolation, validation, and authentication.

## Before you begin

You need VS Code, Postman, Node.js 22 or later, and a working local project setup. If dependencies are not installed, run **📦 Install All Dependencies** from **Tasks: Run Task**.

## 1. Prepare the test database

1. Open a terminal in the repository root, the folder containing `package.json` and `supabase`.
2. Start the local Supabase stack or confirm the dedicated test database and Supabase Auth project are available.
3. Apply the repository migrations and run the seed workflow, including `supabase/seeds/013_timeline.sql`.
4. Confirm the seeded James and Harvey accounts can log in with `password123`.

The timeline seed uses the seed user's timezone and updates named fixtures on reruns. Do not reset or reseed a shared database.

## 2. Configure the backend

1. Open `backend/.env`. If it does not exist, run **🛠️ Setup: Create Environment Files** from **Tasks: Run Task**.
2. Confirm `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` point to the same test environment as the seeded accounts.
3. Set or confirm `NODE_ENV=development`, `PORT=3000`, `WEB_APP_URL=http://localhost:4200`, and `CORS_ALLOWED_ORIGINS=http://localhost:4200`.
4. Save `backend/.env`.

Keep the service-role key and database URI private in `backend/.env`. Do not put credentials or tokens in the Postman environment.

## 3. Start the API

1. In VS Code, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, and select **🚀 Dev: Start All**.
2. Keep the task running and wait for the backend to report that it is listening on port `3000`.
3. Open `http://localhost:3000/health` in a browser to confirm the API is reachable.

## 4. Import the Postman files

This folder contains:

- `Project-Team-404 API - 18-task-timeline.postman_collection.json`
- `Project-Team-404 Local (18-task-timeline).postman_environment.json`

In Postman, use **Import > Files** to import both files. Confirm the collection and environment appear as **Project-Team-404 API - 18-task-timeline** and **Project-Team-404 Local (18-task-timeline)**.

## 5. Select and check the environment

Select **Project-Team-404 Local (18-task-timeline)** in Postman's environment selector. Check the current values:

| Variable | Expected value/action |
| --- | --- |
| `baseUrl` | `http://localhost:3000/api` |
| `token`, `tokenB` | Leave blank; the login requests set them. |
| `timelineProjectId` | Leave blank; the baseline request captures it. |
| `seedToday`, `weekStart`, `weekTo`, `windowFrom`, `windowTo`, `rangeEnd` | Leave blank; the folder pre-request script calculates them. |

The environment contains no credentials or tokens. Do not manually fill generated values.

## 6. Run all requests in Collection Runner

1. Confirm the backend is running and the `18-task-timeline` environment is selected.
2. Expand **Project-Team-404 API - 18-task-timeline** and click **Run**.
3. Select all 13 requests in the folder, keep their current order, and select the `18-task-timeline` environment.
4. Click **Run 18-task-timeline** and wait for the result summary.

The reverse-range, over-92-day, invalid-date, and malformed-project requests are expected to return `400`; the missing-token request is expected to return `401`.

Save the successful run output as `run-results.txt`, the Runner summary screenshot as `runner-summary.png`, and screenshots of the baseline and clipped-window responses in this folder.

If Newman is installed, the collection can also be run from PowerShell:

```powershell
newman run "tests/postman/18-task-timeline/Project-Team-404 API - 18-task-timeline.postman_collection.json" --environment "tests/postman/18-task-timeline/Project-Team-404 Local (18-task-timeline).postman_environment.json" --reporters cli | Tee-Object -FilePath "tests/postman/18-task-timeline/run-results.txt"
$newmanExitCode = $LASTEXITCODE
if ($newmanExitCode -ne 0) { exit $newmanExitCode }
```

## 7. Request order and expected results

| Order | Request | Expected result/action |
| ---: | --- | --- |
| 1 | Login James | `200`; sets `token`. |
| 2 | Login Harvey | `200`; sets `tokenB`. |
| 3 | Baseline spans and undated count | `200`; checks start/end dates, overdue state, and undated exclusion/count; captures the project ID. |
| 4 | Include bars crossing the request window | `200`; confirms one bar starts before `from` and another ends after `to`. |
| 5 | Completed tasks are opt-in | `200`; completed fixture is absent by default. |
| 6 | Include completed task | `200`; completed fixture appears with `includeCompleted=true`. |
| 7 | Project and task filters apply | `200`; results match the captured project and `isDone=true`. |
| 8 | Other users' tasks never appear | `200`; James cannot see Harvey's timeline fixtures. |
| 9-12 | Reverse range, overlong range, invalid date, malformed project | `400`. |
| 13 | Missing token | `401`. |

## 8. Common failures

| Postman result | Check this |
| --- | --- |
| Connection refused or no response | Confirm the backend is running and `baseUrl` is `http://localhost:3000/api`. |
| Login returns `401` | Confirm both seeded users exist, their password is `password123`, and backend Auth/database settings target the same test environment. |
| A fixture is missing | Apply the current migrations and rerun the seed workflow on the test database. |
| Project-filter request returns no bars | Run the baseline request first and confirm `timelineProjectId` was captured. |
| A date assertion fails | Confirm the seeded user's timezone is `Asia/Manila` and the database date matches the current seed date. |
| A migration or seed task reports an error | Stop and inspect the local Supabase output; do not use a destructive reset against shared or remote data. |
