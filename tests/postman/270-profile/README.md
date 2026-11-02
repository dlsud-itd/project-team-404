# Profile Postman Guide: Remote Supabase

This guide explains how to run the profile and password-change Postman collection against a **dedicated remote Supabase test project**. It assumes you are new to Postman and Supabase. You do not need Docker, and you must not start local Supabase.

## Can I run the collection all at once?

**Yes. This collection is designed to run all 34 requests in one Postman Collection Runner session.** Select the correct environment, keep the requests in their existing order, and start the run. The scripts automatically create the temporary username, log in the seeded users, capture session tokens, and save James's original profile values. There are no reset links to copy or manual pauses.

Order is important: each request builds on values created by earlier requests. The final two requests restore James's seeded profile and password. If you send requests individually for troubleshooting, send them in order and make sure you reach those final restore requests.

## Important safety warning

Use a **dedicated, isolated Supabase project for testing**. Do not use production, a teammate's project, or a shared development project. These tests modify James's profile and password and create session records in the selected remote project.

Never run **Supabase: Reset REMOTE DB (destructive)** for this guide. It drops and recreates the linked remote database. Use **Supabase: Seed Remote (no reset)** to ensure the seeded users and fixtures exist. That task does not reset the whole database, but it does create or update the specific seeded test users and fixtures.

## What the collection uses

The collection uses the actual Supabase Auth users and corresponding profile rows created by `supabase/seeds/001_users.sql`:

| Account | Email | Username | Password |
| --- | --- | --- | --- |
| James | `james@example.com` | `james` | `password123` |
| Harvey | `harvey@example.com` | `harvey` | `password123` |
| Alex | `alex@example.com` | `alex` | `password123` |

Postman does not create these accounts. The backend reads user profiles from PostgreSQL and checks credentials through Supabase Auth. Therefore, `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env` must all refer to the **same test project**.

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
3. Run **🌱 Supabase: Seed Remote (no reset)**. This task checks whether the expected fixtures exist, runs missing or incorrect seed files, and verifies the results. It should report each file as `SUCCEEDED` or `SKIPPED`:
   - `001_users.sql`
   - `002_inbox_projects.sql`
   - `003_password_reset_tokens.sql`
   - `004_projects.sql`
   - `005_tasks.sql`
4. If any seed reports `ERROR`, stop and read the output before using Postman. Do not use the destructive remote reset task to get past a seed error.

The user seed sets James, Harvey, and Alex's passwords to `password123` and resets their seed profile data. This project must be isolated because this is real remote data. Run **🌱 Supabase: Seed Remote (no reset)** before a new full collection run if an earlier run stopped before restoring James's profile or password.

## 4. Configure the local backend for the remote project

Postman calls the Express API running on your computer. The local API connects to the remote Supabase project. You do not need to deploy the API or enter Supabase credentials in Postman.

1. In VS Code's Explorer (the files icon on the far-left activity bar), expand `backend` and open `backend/.env`. If the file does not exist, run **🛠️ Setup: Create Environment Files** from **Tasks: Run Task**.
2. In the Supabase Dashboard for the same test project, find:
   - The project API URL, usually under **Project Settings > API** or the project overview.
   - A server-side secret/service-role key under **Project Settings > API Keys**. Use the privileged server-side key, not the publishable/anon key.
   - The PostgreSQL connection URI under **Connect** or **Database > Connection string**.
3. Set these entries in `backend/.env`:

   | Variable | Value to use |
   | --- | --- |
   | `SUPABASE_URL` | The remote test project's API URL. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Its server-side secret/service-role key. |
   | `DATABASE_URL` | Its PostgreSQL connection URI for the backend. |
   | `DIRECT_URL` | The project's direct PostgreSQL connection URI. Follow the connection guidance in the Supabase Dashboard. |
   | `NODE_ENV` | `development` |
   | `PORT` | `3000` |
   | `WEB_APP_URL` | `http://localhost:4200` |
   | `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` |

   Use the connection strings shown by the Supabase Dashboard, not the placeholders in `backend/.env.example`. The database URI contains a password; keep it private. If Supabase offers multiple connection modes, use its Prisma-compatible guidance.
4. Confirm the project reference in `SUPABASE_URL` matches the project linked and seeded above. Confirm the database URI is for that same project. A mismatch can cause logins to fail even when the Postman email and password look right.
5. Profile tests do not send email. If you do not need Brevo for other work, remove or comment out `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` in `backend/.env`. Delete those lines or add `#` at the beginning; do not leave empty assignments such as `BREVO_API_KEY=` because the backend rejects supplied empty strings.
6. Do not put the remote secret key or database URI in the Postman environment. Keep them only in the private backend `.env` file. Do not commit or share that file.
7. Save `backend/.env` with `Ctrl+S`. If the backend is already running, stop it in its terminal with `Ctrl+C` and restart it so it loads the new values.

The `SUPABASE_TEST_*` variables in the example file are for automated integration/E2E runners. These manual Postman requests use `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` from `backend/.env`.

## 5. Start and check the API

1. In VS Code, choose **Terminal > New Terminal** to open a terminal for the API.
2. From the repository root, start the backend:

   ```powershell
   npm --prefix backend run dev
   ```

3. Keep this terminal open while using Postman. It should report that the API is listening on port `3000`.
4. Open this address in a browser to check that the local API is running:

   ```text
   http://localhost:3000/health
   ```

   If the browser cannot connect, the API is not running on that port. This health check confirms the API process is reachable; the first Postman login also checks the Supabase connections and seeded data.

## 6. Do the Postman files need to be changed?

**No. The current collection and environment files are ready for this workflow.** The environment's `baseUrl` should remain `http://localhost:3000/api`; this is the local API URL, even though the API connects to remote Supabase.

The environment already contains the seeded account emails and password. Leave these generated values blank; the collection fills them in while it runs:

- `token`, `tokenB`, and `tokenC` hold login session tokens.
- `jamesUserId` is captured from James's login.
- `originalUsername` and `originalTimezone` are captured from his starting profile.
- `profileUsername` is generated uniquely before the run.

`changedPassword` should remain `PostmanChanged123!`. The collection changes James's password to this value and restores it to `password123` at the end. Do not paste Supabase keys into Postman.

## 7. Import the Postman collection and environment

The folder contains two JSON files:

- `Project-Team-404 API - 270-profile.postman_collection.json`
- `Project-Team-404 Local (270-profile).postman_environment.json`

The collection contains requests and assertions. The environment contains values referenced by those requests.

1. In Postman, open the workspace where you want these tests. The left sidebar has sections such as **Collections** and **Environments**.
2. Open Windows File Explorer and navigate to:

   ```text
   C:\Users\Matthew\source\repos\project-team-404\tests\postman\270-profile
   ```

3. Select both JSON files. Click the collection JSON file, then hold `Ctrl` and click the environment JSON file so both are selected.
4. Drag both selected files from File Explorer into the main Postman window and drop them. Postman should show an import preview. Confirm the import.

   Alternatively, click **Import** in Postman, choose **Files**, browse to the folder above, select both JSON files, and confirm.
5. Confirm that the left sidebar shows **Project-Team-404 API - 270-profile** under **Collections** and **Project-Team-404 Local (270-profile)** under **Environments**.

## 8. Select and check the Postman environment

Postman has both collection and environment variables. These requests use the **environment**. It is normal if the collection's **Variables** tab is empty.

1. Find the environment selector near the upper-right corner of Postman. Click it and choose **Project-Team-404 Local (270-profile)**. The selected environment should also have a check mark under **Environments** in the left sidebar.
2. Open that environment's variables. Depending on your Postman version, click its name in the sidebar or use the selector's edit icon.
3. Check the **Current value** column:

   | Variable | Expected value or action |
   | --- | --- |
   | `baseUrl` | `http://localhost:3000/api` |
   | `seedPassword` | `password123` |
   | `jamesEmail` | `james@example.com` |
   | `harveyEmail` | `harvey@example.com` |
   | `alexEmail` | `alex@example.com` |
   | `changedPassword` | `PostmanChanged123!` |
   | `token`, `tokenB`, `tokenC` | Leave blank; requests populate these. |
   | `profileUsername` | Leave blank; the first request generates it. |
   | `originalUsername`, `originalTimezone`, `jamesUserId` | Leave blank; requests capture these. |
4. If `baseUrl` is different, set its current value to `http://localhost:3000/api`. This is the local API URL, not the remote Supabase URL.
5. Do not fill the generated variables manually. Save the environment if Postman shows a **Save** button or unsaved-changes indicator; some versions save automatically.

## 9. Run all requests at once in Postman Runner

This is the recommended way to run the full collection.

1. Make sure the backend terminal is still running and the environment **Project-Team-404 Local (270-profile)** is selected in Postman's upper-right environment selector.
2. In the left sidebar, find **Project-Team-404 API - 270-profile** under **Collections**.
3. Click the collection's **Run** button. If it is not visible, click the collection name or its `...` menu and choose **Run**.
4. The Collection Runner opens. Select the `270-profile` folder if Postman asks which folder to run. Confirm the environment is **Project-Team-404 Local (270-profile)**.
5. Keep all requests selected and in their existing order. Do not reorder or skip the first setup requests or final restore requests.
6. Click **Run 270-profile** (or the equivalent **Run** button in your Postman version).
7. Wait for the run to finish, then review the summary. Every assertion should pass. Some requests are expected to return `400` or `401`; those are valid negative tests when Postman marks their assertions as passed.

The collection updates the environment automatically during the run. You do not need to copy tokens, stop for prompts, or type the generated username.

## 10. Run requests individually when troubleshooting

You can also send requests one at a time:

1. Expand **Project-Team-404 API - 270-profile** and then its **270-profile** folder in the left sidebar.
2. Click the first request and confirm the 270 environment is selected.
3. Click **Send** and inspect the response status and **Test Results** area.
4. Continue by clicking and sending the next request in order. Never jump directly to a request that needs a token or profile value from an earlier request.
5. Ensure the last two requests run so James's profile and password are restored.

## 11. Request order and expected results

The Collection Runner should already use this order. This list is also the order to use when sending requests individually.

| Order | Request | Expected result or action |
| ---: | --- | --- |
| 1 | Login as James | `200`; creates `token`, `jamesUserId`, and a unique `profileUsername`. |
| 2 | Create second James session | `200`; creates `tokenB`. |
| 3 | Login as Harvey for duplicate username case | `200`; creates `tokenC`. |
| 4 | Capture original James profile | `200`; stores the current username and timezone. |
| 5 | Update username only | `200`; sets the generated username. |
| 6 | Confirm username update through /me | `200`; confirms it persisted. |
| 7 | Update timezone only | `200`; changes James's timezone to `Europe/London`. |
| 8 | Timezone update leaves username unchanged | `200`. |
| 9 | Invalid IANA timezone is rejected | `400`. |
| 10 | Update username after timezone leaves it unchanged | `200`; appends `-updated` to the generated username. |
| 11 | Username update leaves timezone unchanged | `200`. |
| 12 | Another seeded user username is rejected | `400`; Harvey's username cannot be assigned to James. |
| 13 | Duplicate username rejection did not change profile | `200`; confirms the profile remains unchanged. |
| 14 | Own username can be submitted again | `200`. |
| 15 | Empty username is rejected | `400`. |
| 16 | Username over 50 characters is rejected | `400`. |
| 17 | System fields without profile fields is rejected | `400`. |
| 18 | System field attempts do not change profile | `200`; confirms system fields were ignored. |
| 19 | Profile update without token returns 401 | `401`. |
| 20 | Malformed profile token returns 401 | `401`. |
| 21 | Change password revokes second session only | `200`; changes James's password and revokes `tokenB`, while keeping the caller session valid. |
| 22 | Caller session remains valid after password change | `200`. |
| 23 | Other James session was revoked | `401`. |
| 24 | New password logs in successfully | `200`; logs in with `changedPassword` and stores a new James session in `tokenC`. |
| 25 | Old password no longer logs in | `401`. |
| 26 | Wrong current password is a 400 with field detail | `400`; response details identify `currentPassword`. |
| 27 | Mismatched confirmation is rejected | `400`. |
| 28 | Password under 8 characters is rejected | `400`. |
| 29 | New password equals current password is rejected | `400`. |
| 30 | Password change without token returns 401 | `401`. |
| 31 | Logout a separate James session for logged-out token case | `200`; logs out the new James session in `tokenC`. |
| 32 | Logged-out token cannot access profile | `401`. |
| 33 | Restore James seed profile and password | `200`; restores username `james` and timezone `Asia/Manila`. |
| 34 | Restore original James password | `200`; changes `PostmanChanged123!` back to `password123`. |

## 12. If a run stops before the restore requests

The final requests restore James's seeded profile and password only if the run reaches them. If a run stops after a successful profile or password update, James may still have the generated username/timezone or the temporary password `PostmanChanged123!`.

If possible, resume by sending the remaining requests in order using the same environment variables and a still-valid James session. If the session is not usable or you are unsure what state the profile is in, run **🌱 Supabase: Seed Remote (no reset)** again for the confirmed isolated test project. That reapplies the fixture values without dropping the remote database. Then restart the collection from request 1.

Do not run **Supabase: Reset REMOTE DB (destructive)**. Confirm the CLI and backend point at the dedicated test project before reseeding.

## 13. Common failures

| What Postman shows | Likely cause and next step |
| --- | --- |
| `Could not get any response` or connection refused | The local backend is stopped, or `baseUrl` has the wrong port. Start the backend and check `http://localhost:3000/api`. |
| A seeded login returns `401` | Check `seedPassword`, the account email, whether the remote test project was seeded, and whether `SUPABASE_URL` and `DATABASE_URL` point to the same project. |
| `Get current James user` fails | Run the earlier **Login as James** request in the same Runner session. It sets `token` and `jamesUserId`. |
| The duplicate-username test behaves unexpectedly | Ensure **Login as Harvey for duplicate username case** ran successfully first and the test project has Harvey's seeded profile. |
| Password test requests fail after a previous partial run | James's password may no longer be `password123`. Run **🌱 Supabase: Seed Remote (no reset)** for the confirmed test project, then start from request 1. |
| Logout or session assertions fail | Keep requests in order. The password-change test revokes `tokenB`, and the later new-password login replaces `tokenC` with a second James session. |
| The backend exits after Brevo was removed | Check that `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` are removed/commented out, not present as empty values. Restart the backend. Brevo is not needed for this collection. |
| A migration or seed task reports an error | Stop. Read the full CLI output and confirm the linked project reference before trying again. Do not use a remote reset to get past the error. |

## What a successful run looks like

Postman's Runner summary should show all 34 requests completed and all assertions passed. Responses with `400` and `401` are expected in the invalid-input, unauthenticated, wrong-password, and revoked-session cases.

At the end, James's profile should be back to username `james`, timezone `Asia/Manila`, and password `password123`. The project remains remote; no Docker or local Supabase database is used.
