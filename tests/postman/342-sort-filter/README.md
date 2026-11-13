# Task and Project Sorting & Filtering Postman Guide: Local API

This guide explains how to run the sorting and filtering Postman collection against the local backend and the seeded Harvey fixtures. It assumes you are new to Postman and Supabase. You do not need Docker for these manual checks if the project is already running locally, but you do need the local Supabase stack or an equivalent test database with the filter fixtures loaded.

## Can I run the collection all at once?

**Yes. This collection runs all 9 requests in the `342-sort-filter` folder in one Collection Runner session.** Select the 342 environment and run the folder in its existing order. The login and setup requests capture Harvey's token and the fixture IDs automatically. The later requests use those values in the matrix tests.

Do not reorder or skip the setup requests. The filter and sort matrix requests depend on values created earlier in the folder. Run the collection from the beginning each time so it uses the current fixtures and their generated IDs.

## Important safety warning

Use a **dedicated local or isolated test database**. Do not point the collection at production or a shared development database. These requests are read-only apart from the login session and the fixture lookups, and they do not reset or mutate application records. The collection relies on Harvey's seeded filter fixtures from `supabase/seeds/006_filtering.sql`.

Do not use destructive reset commands against a shared database. If you are using a local Supabase stack, reseed only the disposable local project before running this folder.

## What the collection uses

The collection logs in as Harvey, created by the seeded users fixture:

| Account | Email | Password |
| --- | --- | --- |
| Harvey | `harvey@example.com` | `password123` |

The collection captures IDs from the seeded label and project fixtures:

- `filteringLabelId` and `reviewLabelId` from `GET /labels`
- `filterClientProjectId` and `filterPersonalProjectId` from `GET /projects?isArchived=false`

The backend reads task, label, and project records from PostgreSQL and checks credentials through Supabase Auth, so your database and auth settings must point at the same test environment.

## Before you begin

You need VS Code, Postman, Node.js 22 or later, and a working local project setup. If repository dependencies are not installed, run **📦 Install All Dependencies** from **Tasks: Run Task**.

## 1. Prepare the local database and seed fixtures

1. Open a terminal in the repository root, the folder containing `package.json` and `supabase`.
2. Start the local Supabase stack or otherwise make sure the test database is running.
3. Apply the repository migrations and seed files, including `supabase/seeds/006_filtering.sql`, so Harvey's filter fixtures exist.
4. Confirm the seeded user `harvey@example.com` is present with the password `password123`.

If the local database is already populated, do not assume the fixture rows are present; check the label and project names used by the collection before running the folder.

## 2. Configure the backend

Postman calls the Express API running on your computer.

1. In VS Code's Explorer, open `backend/.env`. If it does not exist, run **🛠️ Setup: Create Environment Files** from **Tasks: Run Task**.
2. Confirm `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` point to the same test environment as the seeded database.
3. Set or confirm `NODE_ENV=development`, `PORT=3000`, `WEB_APP_URL=http://localhost:4200`, and `CORS_ALLOWED_ORIGINS=http://localhost:4200`.
4. Save `backend/.env` with `Ctrl+S`.

Keep service-role and database values private in `backend/.env`. Do not put them in the Postman environment.

## 3. Start the frontend and API

1. In VS Code, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, and select **🚀 Dev: Start All**. This starts the frontend and backend in parallel.
2. Keep the task running while using Postman. Wait for the backend terminal to report that the server is listening on port `3000`.
3. Open `http://localhost:3000/health` in a browser to confirm the API is reachable.

## 4. Import the Postman files

This folder contains:

- `Project-Team-404 API - 342-sort-filter.postman_collection.json`
- `Project-Team-404 Local (342-sort-filter).postman_environment.json`

1. Open Postman and choose your workspace.
2. In Windows File Explorer, open:

   ```text
   C:\Users\USER\Documents\team404-project\project-team-404\tests\postman\342-sort-filter
   ```

3. Select both JSON files and drag them into the Postman window. Confirm the import preview. Alternatively, click **Import**, choose **Files**, select both files, and confirm.
4. Confirm the collection and environment appear as **Project-Team-404 API - 342-sort-filter** and **Project-Team-404 Local (342-sort-filter)**.

## 5. Select and check the environment

The collection's **Variables** tab may be empty; its requests use the selected environment.

1. Click the environment selector near Postman's upper-right corner and select **Project-Team-404 Local (342-sort-filter)**. Confirm it has a check mark under **Environments** in the left sidebar.
2. Check these values in the environment's **Current value** column:

   | Variable | Expected value/action |
   | --- | --- |
   | `baseUrl` | `http://localhost:3000/api` |
   | `harveyEmail` | `harvey@example.com` |
   | `seedPassword` | `password123` |
   | `token` | Leave blank; login sets it. |
   | `filteringLabelId`, `reviewLabelId` | Leave blank; setup requests set them. |
   | `filterClientProjectId`, `filterPersonalProjectId` | Leave blank; setup requests set them. |

3. If `baseUrl` differs, set it to `http://localhost:3000/api`. This is the local API address, not a remote Supabase URL.
4. Do not manually fill generated values. Save the environment if Postman shows a **Save** button or an unsaved-changes indicator.

## 6. Run all requests in Collection Runner

1. Confirm the backend is running and **Project-Team-404 Local (342-sort-filter)** is selected.
2. In the **Collections** sidebar, expand **Project-Team-404 API - 342-sort-filter**.
3. Click the collection's **Run** button or choose **Run** from its `...` menu.
4. In Collection Runner, select all 9 requests in the `342-sort-filter` folder, keep their existing order, and confirm the 342 environment.
5. Click **Run 342-sort-filter** (or the equivalent **Run** button in your Postman version). Wait for the summary.

The matrix requests are expected to return `200` when their sub-cases pass. The invalid-filter and authentication requests are expected to return `400` and `401` respectively when the API rejects bad inputs and missing tokens.

### Send requests one at a time for troubleshooting

Expand the collection folder, click a request, and click **Send**. Keep the same environment selected. Run the login request first, then the setup requests, then the matrix requests.

## 7. Request order and expected results

| Order | Request | Expected result/action |
| ---: | --- | --- |
| 1 | Login - Harvey | `200`; sets `token`. |
| 2 | Setup - Capture filter label IDs | `200`; sets `filteringLabelId` and `reviewLabelId`. |
| 3 | Setup - Capture active fixture project IDs | `200`; sets `filterClientProjectId` and `filterPersonalProjectId`. |
| 4 | Task filter matrix | `200`; validates multi-value and legacy filters, date bounds, due-date presence, overdue/completion rules, recurrence, status, project filters, and combined AND logic. |
| 5 | Task sort matrix | `200`; validates task sort keys and orderings, including null-safe date sorting and stable ID tie-breakers. |
| 6 | Project filter and sort matrix | `200`; validates project filters, sorting, archive/favorite/color filters, limit behavior, and array response without `limit`. |
| 7 | Invalid filter matrix | `400`; invalid task and project query values are rejected. |
| 8 | Tasks require authentication | `401`; missing token is rejected. |
| 9 | Projects require authentication | `401`; missing token is rejected. |

The matrix requests use `pm.sendRequest` and execute many query variants in one request. The test passes when each individual sub-case in that request passes, not just when the top-level status is `200`.

## 8. Data left behind and common failures

The filtered task and project fixtures remain in the seeded test database after a run. This collection is intentionally designed to be read-only and should not create or modify application records.

| Postman result | Check this |
| --- | --- |
| Connection refused or no response | Confirm **🚀 Dev: Start All** is running and `baseUrl` is `http://localhost:3000/api`. |
| Login returns `401` | Confirm the seeded user exists, the password is `password123`, and the backend is connected to the same database as the seed fixtures. |
| A setup request has an empty label or project ID | Run the earlier login and setup requests first, in order. |
| Filter assertions fail | Confirm `supabase/seeds/006_filtering.sql` was applied and the database has the Harvey fixtures. |
| Invalid filter cases unexpectedly return `200` | Confirm the API contract matches the current query parameters and the backend was restarted after config changes. |
| A migration or seed task reports `ERROR` | Stop and inspect the local Supabase output before rerunning the folder. |

This collection does not reset or mutate the app records. It only checks the behavior of task and project filter/sort logic against the preloaded Harvey fixtures.
