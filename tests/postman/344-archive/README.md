# Archive Postman Guide: Local API

This guide explains how to run the archive Postman collection against a local backend and the seeded Harvey fixtures. It follows the same setup and troubleshooting flow as the `342-sort-filter` guide.

## Can I run the collection all at once?

**Yes. The collection runs all 18 requests in the `344-archive` folder in one Collection Runner session.** Select the 344 environment and run the folder in its existing order. Login and setup requests capture the token and fixture IDs automatically; archive mutation requests restore the active fixtures before the list checks.

Do not reorder or skip the setup requests. The task, project, and label requests depend on IDs captured earlier in the folder.

## Important safety warning

Use a **dedicated local or isolated test database**. Do not point the collection at production or a shared development database. The collection temporarily archives and restores one seeded task, project, and label. Run it only against test fixtures.

Do not use destructive reset commands against a shared database. If you are using local Supabase, use the repository's normal migration and seed workflow for the disposable local project.

## What the collection uses

The collection logs in as Harvey, created by the seed files:

| Account | Email | Password |
| --- | --- | --- |
| Harvey | `harvey@example.com` | `password123` |

It uses the archive fixtures from `supabase/seeds/009_archiving.sql`:

- The active task titled `Archive fixture - active task`
- The active project named `Filtering - Client Work`
- The active label named `Archive fixture - Active task label`
- Pre-archived task, project, and label fixtures for archive-list checks

The API reads records from PostgreSQL and checks credentials through Supabase Auth. The database and auth settings must point to the same test environment.

## Before you begin

You need VS Code, Postman, Node.js 22 or later, and a working local project setup. If dependencies are not installed, run **📦 Install All Dependencies** from **Tasks: Run Task**.

## 1. Prepare the local database and seed fixtures

1. Open a terminal in the repository root, the folder containing `package.json` and `supabase`.
2. Start the local Supabase stack or otherwise make sure the test database is running.
3. Apply the repository migrations, including `20261114130000_add_archive_support.sql`.
4. Run the normal seed workflow, including `supabase/seeds/009_archiving.sql`, so Harvey's fixtures exist.
5. Confirm the seeded user `harvey@example.com` can log in with `password123`.

Do not reset or reseed a shared database. The archive seed updates named fixtures so repeated local runs remain predictable.

## 2. Configure the backend

1. Open `backend/.env`. If it does not exist, run **🛠️ Setup: Create Environment Files** from **Tasks: Run Task**.
2. Confirm `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` point to the same test environment as the seeded database.
3. Set or confirm `NODE_ENV=development`, `PORT=3000`, `WEB_APP_URL=http://localhost:4200`, and `CORS_ALLOWED_ORIGINS=http://localhost:4200`.
4. Save `backend/.env`.

Keep the service-role key and database URI private in `backend/.env`. Do not put them in the Postman environment.

## 3. Start the API

1. In VS Code, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, and select **🚀 Dev: Start All**.
2. Keep the task running and wait for the backend to report that it is listening on port `3000`.
3. Open `http://localhost:3000/health` in a browser to confirm the API is reachable.

## 4. Import the Postman files

This folder contains:

- `Project-Team-404 API - 344-archive.postman_collection.json`
- `Project-Team-404 Local (344-archive).postman_environment.json`

In Postman, use **Import > Files** to import both files. Confirm the collection and environment appear as **Project-Team-404 API - 344-archive** and **Project-Team-404 Local (344-archive)**.

## 5. Select and check the environment

Select **Project-Team-404 Local (344-archive)** in Postman's environment selector. Check the current values:

| Variable | Expected value/action |
| --- | --- |
| `baseUrl` | `http://localhost:3000/api` |
| `harveyEmail` | `harvey@example.com` |
| `seedPassword` | `password123` |
| `token` | Leave blank; login sets it. |
| `archiveTaskId`, `archiveProjectId`, `archiveLabelId` | Leave blank; setup requests capture them. |
| `archiveCursor`, `firstArchiveItem` | Leave blank; the archive-list request sets them. |

Do not manually fill generated values. Save the environment if Postman shows unsaved changes.

## 6. Run all requests in Collection Runner

1. Confirm the backend is running and the 344 environment is selected.
2. Expand **Project-Team-404 API - 344-archive** and click **Run**.
3. Select all 18 requests in the `344-archive` folder, keep their current order, and select the 344 environment.
4. Click **Run 344-archive** and wait for the result summary.

The archived task update and archived-label attachment requests are expected to return `409`; invalid archive parameters return `400`; the missing-token request returns `401`. These are expected negative cases.

You can run requests individually by selecting them from the folder. Run login and all three setup requests first; then preserve the order of the mutation, restore, and cursor requests.

## 7. Request order and expected results

| Order | Request | Expected result/action |
| ---: | --- | --- |
| 1 | Login - Harvey | `200`; sets `token`. |
| 2-4 | Setup - Capture active task, project, and label | `200`; saves fixture IDs. |
| 5 | Archive task | `200`; returns `isArchived: true` and `archivedAt`. |
| 6 | Archived task cannot be updated | `409`. |
| 7 | Restore task | `200`; returns `isArchived: false` and `archivedAt: null`. |
| 8 | Archive label | `200`; returns the archived state and timestamp. |
| 9 | Archived label cannot be newly attached | `409`. |
| 10 | Restore label | `200`; clears `archivedAt`. |
| 11 | Archive project | `200`; returns the archived state and timestamp. |
| 12 | Archived project is excluded from active list | `200`; confirms the fixture is absent. |
| 13 | Restore project | `200`; clears `archivedAt`. |
| 14-15 | List archived items - first and next page | `200`; checks groups and non-repeating cursor pagination. |
| 16 | List only archived projects | `200`; task and label groups are empty with total `0`. |
| 17 | Invalid archive limit returns 400 | `400`. |
| 18 | Archive list requires authentication | `401`. |

## 8. Data left behind and common failures

Successful requests restore the active task, project, and label to their original active state. The seeded archived fixtures remain archived; the collection does not delete or create records.

| Postman result | Check this |
| --- | --- |
| Connection refused or no response | Confirm the backend is running and `baseUrl` is `http://localhost:3000/api`. |
| Login returns `401` | Confirm the seeded user exists, the password is `password123`, and auth/database configuration points to the same test project. |
| A setup request cannot find a fixture | Apply the archive migration and run `supabase/seeds/009_archiving.sql` on the test database. |
| An ID in a URL is empty | Start the folder from request 1 and do not skip setup requests. |
| Cursor request fails | Run the first archive-list request before the next-page request and keep the returned cursor unchanged. |
| Migration or seed task reports an error | Stop and inspect the local Supabase output; do not use a destructive reset against shared data. |
