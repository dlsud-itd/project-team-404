# Task and Project Search Postman Guide: Local API

This guide explains how to run the Search collection against the local backend and the seeded Harvey and James fixtures. The collection follows the `342-sort-filter` Postman guide format and checks the Sprint 5 Search API contract one case per request.

## Can I run the collection all at once?

**Yes. Run all 16 requests in the `343-search` folder in their existing order.** The first request logs in Harvey and captures the bearer token. All later requests use that token.

Run the folder from the beginning each time so the token is refreshed. Search requests do not create or modify task or project records.

## Important safety warning

Use a **dedicated local or isolated test database**. Do not point the collection at production or a shared development database. The collection relies on the fixtures in `supabase/seeds/010_search.sql` and the seeded account `harvey@example.com`.

Do not use destructive reset commands against a shared database. The commands below apply pending migrations and rerun idempotent seed files without resetting the database.

## What the collection uses

The collection logs in as Harvey from the user seed:

| Account | Email | Password |
| --- | --- | --- |
| Harvey | `harvey@example.com` | `password123` |

Fixtures cover task title and description matching, project name and description matching, exact/starts-with/contains ranking, case-insensitive search, type and per-group limit behavior, literal `%`, `_`, and backslash searches, deleted and other-user exclusion, archive handling, and empty/invalid queries. James has matching `Orbit` and `ArchiveNeedle` task fixtures to verify that his records are never returned to Harvey.

## Before you begin

You need VS Code, Postman (or Newman), Node.js 22 or later, installed repository dependencies, and a working local Supabase stack. If repository dependencies are not installed, run **📦 Install All Dependencies** from **Tasks: Run Task**.

## 1. Prepare the local database and seed fixtures

1. Open a terminal in the repository root, the folder containing `package.json` and `supabase`.
2. Start the local Supabase stack or otherwise make sure the test database is running.
3. Apply pending migrations, including the search trigram-index migration:

   ```powershell
   node node_modules\supabase\dist\supabase.js migration up --local --include-all
   ```

4. Run the repository seed task:

   ```powershell
   node scripts\supabase-seed.mjs --local
   ```

5. Confirm the task reports `010_search.sql: SUCCEEDED` and `verify_seeds.sql: PASS`.
6. Confirm the seeded user `harvey@example.com` is present with the password `password123`.

These commands do not reset the local database. The search seed is safe to rerun.

## 2. Configure the backend

1. In VS Code's Explorer, open `backend/.env`. If it does not exist, run **🛠️ Setup: Create Environment Files** from **Tasks: Run Task**.
2. Confirm `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` point to the same test environment as the seeded database.
3. Set or confirm `NODE_ENV=development`, `PORT=3000`, `WEB_APP_URL=http://localhost:4200`, and `CORS_ALLOWED_ORIGINS=http://localhost:4200`.
4. Save `backend/.env` with `Ctrl+S`.

Keep service-role and database values private in `backend/.env`. Do not put them in the Postman environment.

## 3. Start the frontend and API

1. In VS Code, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, and select **🚀 Dev: Start All**.
2. Keep the task running while using Postman. Wait for the backend terminal to report that the server is listening on port `3000`.
3. Open `http://localhost:3000/health` in a browser to confirm the API is reachable.

## 4. Import the Postman files

This folder contains:

- `Project-Team-404 API - 343-search.postman_collection.json`
- `Project-Team-404 Local (343-search).postman_environment.json`

1. Open Postman and choose your workspace.
2. In Windows File Explorer, open:

   ```text
   C:\Users\USER\Documents\team404-project\project-team-404\tests\postman\343-search
   ```

3. Select both JSON files and drag them into the Postman window. Confirm the import preview. Alternatively, click **Import**, choose **Files**, select both files, and confirm.
4. Confirm the collection and environment appear as **Project-Team-404 API - 343-search** and **Project-Team-404 Local (343-search)**.

## 5. Select and check the environment

The collection's **Variables** tab may be empty; its requests use the selected environment.

1. Click the environment selector near Postman's upper-right corner and select **Project-Team-404 Local (343-search)**.
2. Check these values in the environment's **Current value** column:

   | Variable | Expected value/action |
   | --- | --- |
   | `baseUrl` | `http://localhost:3000/api` |
   | `harveyEmail` | `harvey@example.com` |
   | `seedPassword` | `password123` |
   | `token` | Leave blank; login sets it. |

3. If `baseUrl` differs, set it to `http://localhost:3000/api`. This is the local API address, not a remote Supabase URL.
4. Save the environment if Postman shows a **Save** button or an unsaved-changes indicator.

## 6. Run all requests

### Postman Collection Runner

1. Confirm the backend is running and **Project-Team-404 Local (343-search)** is selected.
2. In the **Collections** sidebar, expand **Project-Team-404 API - 343-search**.
3. Click the collection's **Run** button or choose **Run** from its `...` menu.
4. Select all 16 requests in the `343-search` folder, keep their existing order, and confirm the 343 environment.
5. Click **Run 343-search** (or the equivalent **Run** button in your Postman version).
6. Export or save the Runner results in this folder as `run-results.txt`. Save any requested screenshots in the same folder; do not include environment secrets or bearer tokens.

### Newman

From the repository root, run:

```powershell
npx --yes newman run "tests\postman\343-search\Project-Team-404 API - 343-search.postman_collection.json" -e "tests\postman\343-search\Project-Team-404 Local (343-search).postman_environment.json" --reporters cli | Tee-Object -FilePath "tests\postman\343-search\run-results.txt"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

The search success cases should return `200`; invalid-query/limit requests should return `400`; missing authentication should return `401`. The saved CLI report records the executed requests and assertions without exporting environment variables. Do not edit the report to turn failures into passes.

### Send requests one at a time for troubleshooting

Expand the collection folder, click a request, and click **Send**. Keep the same environment selected. Run **Login - Harvey** first so later requests have a token.

## 7. Request order and expected results

| Order | Request | Expected result/action |
| ---: | --- | --- |
| 1 | Login - Harvey | `200`; sets `token`. |
| 2 | Task title - case-insensitive ranking | `200`; exact, starts-with, then contains task title matches. |
| 3 | Task description - matched field and snippet | `200`; identifies `description` and returns a short snippet. |
| 4 | Project name - case-insensitive ranking | `200`; exact, starts-with, then contains project names. |
| 5 | Project description - matched field and snippet | `200`; identifies `description` and returns a short snippet. |
| 6 | Type and limit - independent groups | `200`; limit applies separately to tasks and projects, totals remain complete. |
| 7 | Literal search - percent and underscore | `200`; `%` and `_` are searched literally. |
| 8 | Literal search - backslash | `200`; backslash is searched literally. |
| 9 | Deleted and other-user rows are excluded | `200`; deleted records and James's Orbit task are absent. |
| 10 | Archived items - excluded by default | `200`; archived items and tasks in archived projects are excluded. |
| 11 | Archived items - included when requested | `200`; archived tasks/projects and tasks in archived projects are returned. |
| 12 | No matches - empty groups | `200`; both groups are empty with total `0`. |
| 13 | Invalid query - shorter than 2 | `400`. |
| 14 | Invalid query - longer than 100 | `400`. |
| 15 | Invalid limit - above 20 | `400`. |
| 16 | Search requires authentication | `401`; missing token is rejected. |

## 8. Data left behind and common failures

The search fixtures remain in the seeded test database after a run. The collection does not create, edit, archive, or delete application records.

| Postman result | Check this |
| --- | --- |
| Connection refused or no response | Confirm **🚀 Dev: Start All** is running and `baseUrl` is `http://localhost:3000/api`. |
| Login returns `401` | Confirm the seeded user exists, the password is `password123`, and the backend is connected to the same database as the seed fixtures. |
| Search reports no fixture matches | Confirm `010_search.sql` succeeded and `verify_seeds.sql` passed. |
| Ranking or description checks fail | Confirm the backend was restarted after code changes and the fixtures were reloaded. |
| Archive checks fail | Confirm the archive migration was applied before running the seed task. |
| Literal-symbol checks fail | Confirm the latest search implementation and `010_search.sql` fixtures are in place. |
| A migration or seed task reports `ERROR` | Stop and inspect the local Supabase output before rerunning the collection. |
