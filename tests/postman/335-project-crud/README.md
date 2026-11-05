# Project CRUD Postman Guide: Remote Supabase

This guide explains how to run the project CRUD Postman collection against a **dedicated remote Supabase test project**. It assumes you are new to Postman and Supabase. You do not need Docker, and you must not start local Supabase.

## Can I run the collection all at once?

**Yes. This collection is designed to run all 31 requests in one Collection Runner session.** Select the 335 environment and run the `335-project-crud` folder in its existing order. Login requests and setup requests automatically capture the session tokens, James's Inbox ID, user ID, and IDs for projects created by the run. There are no manual copy/paste steps.

The order matters: later project requests use IDs captured from the setup responses. Do not reorder or skip the first setup requests. The final tests intentionally leave most created test projects in the database, so use only an isolated test project.

## Important safety warning

Use a **dedicated, isolated Supabase project for testing**. Do not use production, a teammate's project, or a shared development project. These tests create real projects, and one test soft-deletes a project. They do not remove all project rows after a run.

Never run **Supabase: Reset REMOTE DB (destructive)** for this guide. It drops and recreates the linked remote database. Use **Supabase: Seed Remote (no reset)** for fixtures; it does not reset the whole database, but it does create/update the seeded users and other seed data.

## What the collection uses

The collection logs in as the Supabase-seeded users:

| Account | Email | Password |
| --- | --- | --- |
| James | `james@example.com` | `password123` |
| Harvey | `harvey@example.com` | `password123` |

They and their Inbox projects are created by `supabase/seeds/001_users.sql` and `supabase/seeds/002_inbox_projects.sql`. Postman does not create these accounts. The backend reads profile/project rows from PostgreSQL and verifies credentials through Supabase Auth, so `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` must all refer to the same test project.

## Before you begin

You need VS Code, Postman, Node.js 22 or later, and access to a dedicated remote Supabase test project. Docker Desktop is not needed. If the repository dependencies are not installed, run **📦 Install All Dependencies** from **Tasks: Run Task**.

## 1. Link and prepare the remote test project

1. Sign in to the Supabase Dashboard and open the dedicated test project. Note its name and project reference. Do not continue if you cannot distinguish it from production or shared development.
2. In VS Code, choose **Terminal > New Terminal**. Confirm the terminal is at the repository root, the folder containing `package.json` and `supabase`. If needed, enter:

   ```powershell
   cd C:\Users\Matthew\source\repos\project-team-404
   ```

3. Open the Command Palette with `Ctrl+Shift+P`, choose **Tasks: Run Task**, and run **🔐 Supabase: Login**. Follow the browser sign-in steps.
4. Run **🔗 Supabase: Link Project**. Select the dedicated test project and verify its name/reference before confirming. Enter its database password directly into the terminal if prompted; do not put that password in Postman or a checked-in file.
5. Run **📊 Supabase: Check Migration Status**. If repository migrations are pending, run **📤 Supabase: Push Migrations**. If the CLI suggests destructive reset/replacement, cancel and confirm with the project owner.
6. Run **🌱 Supabase: Seed Remote (no reset)**. Each seed file runs against the linked project and reports `SUCCEEDED` or `ERROR` based on SQL execution. Stop if any seed reports `ERROR`.

The remote seed task is not a full database reset, but it resets the seeded users' passwords to `password123` and updates fixture rows. Run it only against the dedicated test project.

## 2. Configure the backend

Postman talks to the Express API on your computer. The API connects to the remote test project.

1. In VS Code's Explorer, open `backend/.env`. If it does not exist, run **🛠️ Setup: Create Environment Files** from **Tasks: Run Task**.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` to values for the same remote test project. Set `DIRECT_URL` to its direct database URI. Use the values from the Supabase Dashboard, not the example placeholders in `backend/.env.example`.
3. Set or confirm `NODE_ENV=development`, `PORT=3000`, `WEB_APP_URL=http://localhost:4200`, and `CORS_ALLOWED_ORIGINS=http://localhost:4200`.
4. Project CRUD does not send email. If you have no other reason to configure Brevo, remove or comment out `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`. Do not set them to empty strings; the backend rejects supplied empty values.
5. Save `backend/.env` with `Ctrl+S`. If the backend is already running, stop it with `Ctrl+C`; start it again in the next section.

Keep the service-role key and database URI private in `backend/.env`. Do not put them in the Postman environment. The `SUPABASE_TEST_*` variables are for automated test runners, not these manual Postman requests.

## 3. Start the frontend and API

1. In VS Code, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, and select **🚀 Dev: Start All**. This starts the frontend and backend in parallel.
2. Keep the task running while using Postman. Wait for the backend terminal to report that the server is listening on port `3000`; the frontend runs on port `4200`.
3. Open `http://localhost:3000/health` in a browser to confirm that the API is reachable.

## 4. Import the Postman files

This folder contains:

- `Project-Team-404 API - 335-project-crud.postman_collection.json`
- `Project-Team-404 Local (335-project-crud).postman_environment.json`

The collection contains requests and assertions; the environment contains `baseUrl`, seeded account details, and runtime variables.

1. Open Postman and choose the workspace where you want these tests.
2. In Windows File Explorer, open:

   ```text
   C:\Users\Matthew\source\repos\project-team-404\tests\postman\335-project-crud
   ```

3. Select both JSON files: click one, hold `Ctrl`, and click the other.
4. Drag both files into the Postman window and drop them. Confirm Postman's import preview. Alternatively, click **Import**, choose **Files**, select both files, and confirm.
5. In Postman's left sidebar, confirm the collection appears as **Project-Team-404 API - 335-project-crud** and the environment as **Project-Team-404 Local (335-project-crud)**.

## 5. Select and check the environment

The collection's **Variables** tab may be empty; the requests use the selected environment.

1. Click the environment selector near Postman's upper-right corner and select **Project-Team-404 Local (335-project-crud)**. Confirm it has a check mark under **Environments** in the left sidebar.
2. Open the environment variables and check **Current value**:

   | Variable | Expected value/action |
   | --- | --- |
   | `baseUrl` | `http://localhost:3000/api` |
   | `seedPassword` | `password123` |
   | `jamesEmail` | `james@example.com` |
   | `harveyEmail` | `harvey@example.com` |
   | `token`, `tokenB` | Leave blank; login requests set them. |
   | `inboxProjectId`, `jamesUserId` | Leave blank; the profile request sets them. |
   | `projectId`, `projectId2`, `projectIdB` | Leave blank; project setup requests set them. |
   | `deletedProjectId` | Leave blank; its setup request sets it. |

3. If `baseUrl` differs, set it to `http://localhost:3000/api`. This is the local API address, not the remote Supabase URL.
4. Do not manually fill the generated variables. Save the environment if Postman shows a **Save** button or unsaved-changes indicator.

## 6. Run all requests in Collection Runner

1. Confirm the backend is running and the 335 environment is selected.
2. In the **Collections** sidebar, click the small arrow beside **Project-Team-404 API - 335-project-crud** to expand it.
3. Click **Run** on the collection, or click the collection's `...` menu and choose **Run**.
4. In Collection Runner, select the **335-project-crud** folder if asked. Confirm **Project-Team-404 Local (335-project-crud)** is selected.
5. Keep all 31 requests selected and in their existing order.
6. Click **Run 335-project-crud**. Wait for the run summary.

Some requests are supposed to return `400`, `401`, `403`, or `404`. Those are expected negative cases; the test passes when the response has the expected status and assertions.

### Send requests one at a time for troubleshooting

You can click each request in the expanded folder and press **Send** instead. Still use the same order. In particular:

- Send the two login requests before requests that require `token` or `tokenB`.
- Send **Capture James Inbox ID** before the Inbox-protection tests.
- Send the four successful project setup requests before requests that use `projectId`, `projectIdB`, or `deletedProjectId`. The next request deliberately submits a server-managed Inbox field and should return `400`.

## 7. Request order and expected results

| Order | Request | Expected result/action |
| ---: | --- | --- |
| 1 | Login as James (owner) | `200`; sets `token`. |
| 2 | Login as Harvey (second owner) | `200`; sets `tokenB`. |
| 3 | Capture James Inbox ID | `200`; saves James's Inbox project ID and user ID. |
| 4 | Setup - Create James CRUD project | `201`; saves `projectId`. |
| 5 | Setup - Create James second CRUD project | `201`; saves `projectId2`. |
| 6 | Setup - Create James project to delete | `201`; saves `deletedProjectId`. |
| 7 | Setup - Create Harvey ownership project | `201`; saves `projectIdB`. |
| 8 | Client-supplied Inbox flag is rejected | `400`; the API rejects server-managed project fields. |
| 9 | Create project with empty name returns 400 | `400`. |
| 10 | Create project with name over 150 characters returns 400 | `400`. |
| 11 | Create project with invalid color returns 400 | `400`. |
| 12 | List James projects including Inbox | `200`. |
| 13 | Get own project returns 200 | `200`. |
| 14 | Get missing project returns 404 | `404`. |
| 15 | Get non-numeric project ID returns 400 | `400`. |
| 16 | Update own project fields | `200`. |
| 17 | Confirm project update persisted | `200`. |
| 18 | Updating the Inbox is rejected | `403`. |
| 19 | Deleting the Inbox is rejected | `403`. |
| 20 | Get Harvey project as James returns 404 | `404`. |
| 21 | Update Harvey project as James returns 404 | `404`. |
| 22 | Delete Harvey project as James returns 404 | `404`. |
| 23 | Delete own project returns 204 | `204`; soft-deletes the temporary project. |
| 24 | Soft-deleted project leaves the list | `200`. |
| 25 | Get soft-deleted project returns 404 | `404`. |
| 26 | Second delete returns 404 | `404`. |
| 27 | Create project without token returns 401 | `401`. |
| 28 | List projects without token returns 401 | `401`. |
| 29 | Get project without token returns 401 | `401`. |
| 30 | Update project without token returns 401 | `401`. |
| 31 | Delete project without token returns 401 | `401`. |

## 8. Data left behind and common failures

The collection does not clean up every project it creates. It soft-deletes the specific project used for the deleted-project tests, but other setup projects remain. Repeated runs create additional projects. This is expected for an isolated test database; do not use production or shared project data.

| Postman result | Check this |
| --- | --- |
| Connection refused or no response | Confirm the backend is running and `baseUrl` is `http://localhost:3000/api`. |
| A login returns `401` | Confirm the remote test project was seeded, `seedPassword` is `password123`, and `SUPABASE_URL`/`DATABASE_URL` target the same project. |
| `projectId` or another ID is blank/invalid | Earlier login or setup requests did not pass in this Runner session. Run the folder from the beginning in order. |
| Inbox test does not return `403` | Confirm request 3 captured James's Inbox ID and the remote project has the Inbox fixture. |
| Backend exits after removing Brevo | Remove/comment out Brevo settings instead of leaving empty assignments, then restart the backend. |
| Migration or seed task reports `ERROR` | Stop and inspect the CLI output and linked project. Do not use the destructive remote reset task. |

At the end, James's profile and password are unchanged. The remote test database may contain the additional project fixtures created by the collection.
