# Task Reorder Postman Guide: Local API

This guide explains how to run the task reorder collection against the local API and a disposable test database.

## Can I run the collection all at once?

**Yes. The collection runs all 21 requests in the `16-task-reorder` folder in one Collection Runner session.** Login and setup requests capture tokens and fixture IDs automatically. Do not reorder or skip the setup requests; later requests depend on their values.

## Important safety warning

Use a **disposable local database or a dedicated isolated test project**. Do not point the collection at production or a shared development database. The collection creates projects and tasks and leaves them in the database, including one soft-deleted task. Repeated runs create additional fixtures.

Do not use the destructive remote reset task to prepare the collection. Apply migrations and seeds only to the disposable test environment, and verify the backend and database target that same environment.

## What the collection uses

The collection logs in as James and Harvey, created by `supabase/seeds/001_users.sql`:

| Account | Email | Password |
| --- | --- | --- |
| James | `james@example.com` | `password123` |
| Harvey | `harvey@example.com` | `password123` |

Requests create their own projects and tasks for both users. The environment contains `baseUrl` and blank token/fixture variables; login and setup requests populate the latter during the run. The backend database and Supabase Auth settings must point to the same test environment.

## Before you begin

You need VS Code, Postman, Node.js 22 or later, and a prepared local or dedicated test environment. If dependencies are not installed, run **📦 Install All Dependencies** from **Tasks: Run Task**.

## 1. Prepare the test database

1. Open a terminal in the repository root, the folder containing `package.json` and `supabase`.
2. Start the local Supabase stack or confirm the dedicated test database and Supabase Auth project are available.
3. Apply the repository migrations and seed the James and Harvey accounts.
4. Confirm both seeded accounts can log in with `password123`.

Do not reset or reseed a shared database. If the CLI suggests a destructive operation, cancel and confirm the target with the project owner.

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

- `Project-Team-404 API - 16-task-reorder.postman_collection.json`
- `Project-Team-404 Local (16-task-reorder).postman_environment.json`

In Postman, use **Import > Files** to import both files. Confirm the collection and environment appear as **Project-Team-404 API - 16-task-reorder** and **Project-Team-404 Local (16-task-reorder)**.

## 5. Select and check the environment

Select **Project-Team-404 Local (16-task-reorder)** in Postman's environment selector. Check the current values:

| Variable | Expected value/action |
| --- | --- |
| `baseUrl` | `http://localhost:3000/api` |
| `token`, `tokenB` | Leave blank; login requests set them. |
| `projectId`, `projectId2`, `projectIdB` | Leave blank; project setup requests set them. |
| `taskAId`, `taskBId`, `taskCId` | Leave blank; task setup requests set them. |
| `otherProjectTaskId`, `otherUserTaskId`, `deletedTaskId` | Leave blank; setup requests set them. |
| `appendedTaskId` | Leave blank; the append request sets it. |

Do not manually fill generated values. Save the environment if Postman shows unsaved changes.

## 6. Run all requests in Collection Runner

1. Confirm the backend is running and the `16-task-reorder` environment is selected.
2. Expand **Project-Team-404 API - 16-task-reorder** and click **Run**.
3. Select all 21 requests in the `16-task-reorder` folder, keep their current order, and select the `16-task-reorder` environment.
4. Click **Run 16-task-reorder** and wait for the result summary.

The duplicate/empty-list requests are expected to return `400`; invalid task IDs return `404`; an incomplete list returns `409`; and the missing-token request returns `401`. These are expected negative cases.

Save the successful run output as `run-results.json` and a screenshot of the Collection Runner summary as `runner-summary.png` in this folder.

## 7. Request order and expected results

| Order | Request | Expected result/action |
| ---: | --- | --- |
| 1 | Login James | `200`; sets `token`. |
| 2 | Login Harvey | `200`; sets `tokenB`. |
| 3-5 | Setup James and Harvey projects | `201`; captures project IDs. |
| 6-8 | Setup active tasks A, B, and C | `201`; captures the IDs in James's project. |
| 9 | Setup task in other project | `201`; captures the cross-project ID. |
| 10 | Setup task owned by Harvey | `201`; captures the cross-user ID. |
| 11-12 | Setup and soft-delete task fixture | `201`, then `200`; captures a deleted task ID. |
| 13 | Reorder and GET confirms requested order | `200`; GET returns the requested IDs with positions `1`, `2`, `3`. |
| 14 | New task appears last | `201`; GET confirms the new task is last. |
| 15-16 | Duplicate task IDs and empty list | `400`. |
| 17-19 | Other-project, other-user, and deleted task IDs | `404`. |
| 20 | Missing an active task | `409`. |
| 21 | Reorder requires authentication | `401`. |

## 8. Data left behind and common failures

The collection creates three projects and several tasks. It soft-deletes one task; the other fixtures remain in the database. Use only a disposable local database or a dedicated test project.

| Postman result | Check this |
| --- | --- |
| Connection refused or no response | Confirm the backend is running and `baseUrl` is `http://localhost:3000/api`. |
| Login returns `401` | Confirm both seeded users exist and the backend Auth/database settings target the same test environment. |
| A setup request returns `404` | Confirm the project and user seeds were applied to the test environment. |
| A request URL contains an empty project/task ID | A setup request failed; rerun the collection from the beginning without skipping requests. |
| A reorder case returns an unexpected status | Check the current project tasks and ensure no other test is modifying the same disposable database. |
| A migration or seed task reports an error | Stop and inspect the local Supabase output; do not use a destructive reset against a shared or remote database. |
