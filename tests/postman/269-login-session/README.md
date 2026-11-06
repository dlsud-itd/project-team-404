# Login and Session Postman Guide: Remote Supabase

This guide explains how to run the login and session Postman collection against a **dedicated remote Supabase test project**. It assumes you are new to Postman and Supabase. You do not need Docker, and you must not start local Supabase.

## Can I run the collection all at once?

**Yes. This collection is designed to run all at once in Postman's Collection Runner.** Select the correct environment and run the `269-login-session` folder in its listed order. The collection automatically saves login tokens and other values needed by later requests; you do not need to copy tokens from the backend terminal.

The order matters. Later requests use tokens created by earlier login requests, and the token-tampering request builds its own modified token. Do not reorder the requests. You can also send requests individually when troubleshooting, but then send them in order so the prerequisite environment values have been set.

## Important safety warning

Use a **dedicated, isolated Supabase project for testing**. Do not use production, a teammate's project, or a shared development project. These tests make real login requests and create session records in the selected project. The seeded account SQL sets James, Harvey, and Alex's passwords to `password123`.

Never run **supabase db reset --linked** for this guide. It drops and recreates the linked remote database. Use **Supabase: Seed Remote** to ensure the test accounts and fixtures exist. That task does not reset the whole database, but it does create or update the specific seeded test accounts and other fixtures.

## What the collection uses

The collection uses the actual Supabase Auth users and profile rows created by `supabase/seeds/001_users.sql`:

| Account | Email | Username | Password |
| --- | --- | --- | --- |
| James | `james@example.com` | `james` | `password123` |
| Harvey | `harvey@example.com` | `harvey` | `password123` |
| Alex | `alex@example.com` | `alex` | `password123` |

Postman does not create these accounts. The backend checks the user profile through PostgreSQL and verifies the password through Supabase Auth, so the backend's `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` must all point to the **same test project**.

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

The CLI and backend must both target the same test project. If you cannot confidently identify that project, stop before pushing migrations or seeding data.

## 2. Sign in and link the Supabase CLI

1. In VS Code, choose **Terminal > New Terminal** from the top menu.
2. Check that the terminal is at the repository root. Its path should end in `project-team-404`, the folder that contains `package.json` and `supabase`. If not, enter:

   ```powershell
   cd C:\Users\Matthew\source\repos\project-team-404
   ```

3. Open VS Code's Command Palette with `Ctrl+Shift+P`, choose **Tasks: Run Task**, and run **🔐 Supabase: Login**. Follow the browser sign-in and authorization steps.
4. Run **🔗 Supabase: Link Project** from the same task menu. Select the dedicated test project you confirmed in step 1. Check the project name/reference shown by the CLI before confirming.
5. If the CLI asks for the database password, enter the password for this test project directly into the terminal prompt. Do not paste it into Postman, this guide, or a chat.

## 3. Apply remote migrations and seed the test accounts

1. Run **📊 Supabase: Check Migration Status** from **Tasks: Run Task**. Confirm that the CLI is checking the test project.
2. If repository migrations are pending, run **📤 Supabase: Push Migrations**. Review any CLI prompt carefully. If it proposes resetting or destructively replacing the database, cancel and ask the project owner before proceeding.
3. Run **🌱 Supabase: Seed Remote**. This task executes each seed file against the linked remote project and reports the SQL execution result as `SUCCEEDED` or `ERROR`:
   - `001_users.sql`
   - `002_inbox_projects.sql`
   - `003_password_reset_tokens.sql`
   - `004_projects.sql`
   - `005_tasks.sql`
4. If any seed reports `ERROR`, stop and read the output before using Postman. Do not use the destructive remote reset task to get past a seed error.

The login collection primarily depends on the three Auth accounts and profiles from `001_users.sql`, plus each user's active Inbox project. The seed task also applies and verifies the other repository fixtures. The user seed sets the three passwords to `password123`, which is why this project must be isolated.

If James, Harvey, or Alex login fails because the credentials are stale, run **🌱 Supabase: Seed Remote** again for the confirmed test project. The collection itself does not change account passwords.

## 4. Configure the local backend to use the remote project

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
4. Confirm the project reference in `SUPABASE_URL` matches the project you linked and seeded. Confirm the database URI is for that same project. A mismatch can cause login to return `401` even when Postman shows the expected email and password.
5. Remove or comment out the Brevo settings in `backend/.env` if you do not want email sending:

   ```dotenv
   BREVO_API_KEY=...
   BREVO_SENDER_EMAIL=...
   ```

   Delete those lines or add `#` at the beginning. Do **not** leave them as empty assignments such as `BREVO_API_KEY=`. The backend rejects supplied empty strings. Login/session tests do not send emails, so Brevo is not required for this collection.
6. Do not put the remote secret key or database URI in Postman. Keep them only in the private backend `.env` file. Do not commit or share that file.
7. Save `backend/.env` with `Ctrl+S`. If the backend is already running, stop it in its terminal with `Ctrl+C` and restart it so it loads the new values.

The `SUPABASE_TEST_*` variables in the example file are for automated integration/E2E runners. These manual Postman requests use `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` from `backend/.env`.

## 5. Start the frontend and API

1. In VS Code, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, and select **🚀 Dev: Start All**. This starts the frontend and backend in parallel.
2. Keep the task running while using Postman. Wait for the backend terminal to report that the server is listening on port `3000`; the frontend runs on port `4200`.
3. Open this address in a browser to check that the local API is running:

   ```text
   http://localhost:3000/health
   ```

   If the browser cannot connect, the API is not running on that port. This health check confirms the API process is reachable; the first Postman login additionally checks the Supabase connections and seeded data.

## 6. Import the Postman collection and environment

The folder contains two JSON files:

- `Project-Team-404 API - 269-login-session.postman_collection.json`
- `Project-Team-404 Local (269-login-session).postman_environment.json`

The collection contains requests and assertions. The environment contains values referenced by those requests, such as `baseUrl` and `jamesEmail`.

1. In Postman, open the workspace where you want these tests. The left sidebar has sections such as **Collections** and **Environments**.
2. Open Windows File Explorer and navigate to:

   ```text
   C:\Users\Matthew\source\repos\project-team-404\tests\postman\269-login-session
   ```

3. Select both JSON files. Click the collection JSON file, then hold `Ctrl` and click the environment JSON file so both are selected.
4. Drag both selected files from File Explorer into the main Postman window and drop them. Postman should show an import preview. Confirm the import.

   Alternatively, click **Import** in Postman, choose **Files**, browse to the folder above, select both JSON files, and confirm.
5. Confirm that the left sidebar shows **Project-Team-404 API - 269-login-session** under **Collections** and **Project-Team-404 Local (269-login-session)** under **Environments**.

## 7. Select and check the Postman environment

Postman has both collection and environment variables. These requests use the **environment**. It is normal if the collection's **Variables** tab is empty.

1. Find the environment selector near the upper-right corner of Postman. Click it and choose **Project-Team-404 Local (269-login-session)**. The selected environment should also have a check mark under **Environments** in the left sidebar.
2. Open that environment's variables. Depending on your Postman version, click its name in the sidebar or use the selector's edit icon.
3. Check the **Current value** column:

   | Variable | Expected value or action |
   | --- | --- |
   | `baseUrl` | `http://localhost:3000/api` |
   | `seedPassword` | `password123` |
   | `jamesEmail` | `james@example.com` |
   | `harveyEmail` | `harvey@example.com` |
   | `alexEmail` | `alex@example.com` |
   | `token` | Leave blank; the first successful James login fills it. |
   | `tokenB` | Leave blank; the Harvey login and second James login set it during the run. |
   | `tokenC` | Leave blank; the Alex login fills it. |
   | `jamesUserId` | Leave blank; the first successful James login fills it. |
   | `invalidLoginResponse` | Leave blank; the wrong-password request fills it. |
   | `tamperedToken` | Leave blank; its pre-request script creates it during the run. |

4. If `baseUrl` is different, set its current value to `http://localhost:3000/api`. This is the local API URL, not the remote Supabase URL.
5. Do not manually enter values for `token`, `tokenB`, `tokenC`, `jamesUserId`, `invalidLoginResponse`, or `tamperedToken`. The collection scripts set them. Save the environment if Postman shows a **Save** button or unsaved-changes indicator.

## 8. Run the entire collection at once

You can run all 17 requests in one Collection Runner session. Postman will send them in order and run the assertions after each response.

1. Confirm the backend terminal is still running and the correct 269 environment is selected in Postman's upper-right environment selector.
2. In the left sidebar, find **Project-Team-404 API - 269-login-session** under **Collections**.
3. Click the collection's **Run** button. If you do not see it, click the collection name or its `...` menu and choose **Run**.
4. Postman opens the Collection Runner. Select the `269-login-session` folder if prompted. Make sure the environment is **Project-Team-404 Local (269-login-session)**.
5. Keep the listed request order. Do not deselect requests or reorder them. The later requests depend on earlier responses setting environment variables.
6. Click **Run 269-login-session** (or the equivalent **Run** button in your Postman version).
7. Wait for the run to finish. Review the summary. Every assertion should pass. Some requests are supposed to receive HTTP `400` or `401`; those are successful tests when Postman reports their assertions as passed.

The collection scripts automatically save:

- James's login token as `token` and his user ID as `jamesUserId`.
- Harvey's login token as `tokenB`.
- Alex's login token as `tokenC`.
- The generic wrong-password response as `invalidLoginResponse`.
- A tampered version of James's token immediately before its request.
- A second James login token as `tokenB`, replacing the earlier Harvey token for the later session tests.

There are no reset links to copy and no manual pauses during this collection. The login responses themselves provide the values used by later requests.

### Run requests one at a time when troubleshooting

If the Runner shows a failure and you want to inspect it, open the collection folder and click each request in order, then click **Send**. Keep the same environment selected. Do not start with a request that relies on a variable from an earlier request. For example:

- Send **Login with email (James)** before **Get current James user**. The first request sets `token` and `jamesUserId`.
- Send **Wrong password returns generic 401** before **Unknown identifier returns identical generic 401**. The first request saves `invalidLoginResponse`.
- Send **Second James session** before the logout/session-validity requests. It sets the second James token in `tokenB`.

## 9. Request order and expected results

If running manually, use this exact order. In the Collection Runner, the same order should already be selected.

| Order | Request | Expected result or action |
| ---: | --- | --- |
| 1 | Login with email (James) | `200`; sets `token` and `jamesUserId`. |
| 2 | Login with username (Harvey) | `200`; sets `tokenB`. |
| 3 | Login with mixed-case email (Alex) | `200`; sets `tokenC`. |
| 4 | Get current James user | `200`; uses `token` and `jamesUserId`. |
| 5 | Wrong password returns generic 401 | `401`; saves the generic error response. |
| 6 | Unknown identifier returns identical generic 401 | `401`; compares its response with request 5. |
| 7 | Missing identifier returns 400 | `400`. |
| 8 | Empty password returns 400 | `400`. |
| 9 | Identifier over 255 characters returns 400 | `400`. |
| 10 | Missing Authorization header returns 401 | `401`. |
| 11 | Malformed Authorization header returns 401 | `401`. |
| 12 | Tampered token returns 401 | `401`; its pre-request script makes the tampered token. |
| 13 | Second James session | `200`; saves a second James login token as `tokenB`. |
| 14 | Logout first James session | `200`; revokes the first James session in `token`. |
| 15 | First session is unusable after logout | `401`; verifies `token` is revoked. |
| 16 | Second James session remains valid | `200`; verifies `tokenB` is still valid. |
| 17 | Second logout with revoked token returns 401 | `401`; verifies logging out the revoked first token is rejected. |

The requests that expect `400` or `401` are negative tests. Do not change their expected status just because the response is an error; the error is the intended behavior.

## 10. What is changed in Supabase by a run?

Every successful login creates a server-side session row. The collection logs out its first James session, then confirms James's second session remains active. Harvey's and Alex's login sessions are also created and are not logged out by this collection. The backend session lifetime is 30 days, so rerunning the collection can leave additional test sessions in the dedicated test database.

This collection does not change the seeded users' passwords. The remote seed task sets them back to `password123` if needed. Do not run this collection against a production or shared project.

## 11. Common failures

| What Postman shows | Likely cause and next step |
| --- | --- |
| `Could not get any response` or connection refused | The local backend is stopped, or `baseUrl` has the wrong port. Start the backend and check `http://localhost:3000/api`. |
| One of the seeded logins returns `401` | Check `seedPassword`, the email/username, and whether the remote test project was seeded. Confirm `SUPABASE_URL` and `DATABASE_URL` in the backend belong to the same project. Rerun **🌱 Supabase: Seed Remote** for the confirmed test project if needed. |
| Login says `401` even though `password123` is correct | The backend may be using the wrong Supabase Auth project or key, the seeded account may not be in that project, or the database may contain profiles from a different project. Check all three backend connection values and their project references. |
| `Get current James user` fails but the first login passed | The request may have been sent without first running the login request in this Runner session, or `token`/`jamesUserId` was not populated. Run the collection in order with the correct environment selected. |
| `Unknown identifier returns identical generic 401` fails | Run **Wrong password returns generic 401** first in the same run so it can populate `invalidLoginResponse`. |
| Session/logout requests fail | Run the earlier login requests in order. The logout tests require the tokens set by **Login with email (James)** and **Second James session**. |
| The backend exits after Brevo was removed | Check that `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` are removed/commented out, not present as empty values. Restart the backend. Brevo is not needed for this collection. |
| A migration or seed task reports an error | Stop. Read the full CLI output and confirm the linked project reference before trying again. Do not use a remote reset to get past the error. |

## What a successful run looks like

Postman's Runner summary should show all 17 requests completed and all assertions passed. Responses with `400` and `401` are expected for the invalid-input, wrong-password, malformed-token, and revoked-session cases.

The users remain in the dedicated remote test project with their seeded password `password123`. Several session rows may remain from successful logins; that is expected for this test collection.
