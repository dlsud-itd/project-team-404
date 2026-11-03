# Password Recovery Postman Guide: Remote Supabase

This guide explains how to run the password-recovery Postman collection when the API connects to a **remote Supabase test project**. It assumes you are new to Postman and Supabase. You do not need Docker, and you must not start local Supabase.

## Can I run the collection all at once?

**No, not as a single unattended Collection Runner run.** Three reset-link requests print raw tokens in the backend terminal, and those values must be pasted into the Postman environment before dependent requests can run. Send requests individually, in the listed order, and follow the token-copy steps in this guide.

## Important safety warning

Use a **dedicated, isolated Supabase project for testing**. Do not use production, a teammate's project, or a shared development project. These steps seed and modify real rows in the selected remote database. The tests change James's password, create and invalidate reset tokens, and revoke sessions.

Never run the task named **Supabase: Reset REMOTE DB (destructive)** for this guide. It drops and recreates the linked remote database. This guide uses **Supabase: Seed Remote (no reset)** instead; that task does not reset the database, but it does create or update the specific seeded test accounts and fixtures.

## What the collection uses

The collection tests actual data in the remote Supabase database. Postman does not create the seeded accounts:

- `supabase/seeds/001_users.sql` creates or updates James, Harvey, and Alex. Their shared seeded password is `password123`.
- `supabase/seeds/003_password_reset_tokens.sql` inserts known valid, expired, and used reset tokens. The raw token values are in the Postman environment file.
- The forgot-password requests call the API, which creates reset-token rows in Supabase. With Brevo disabled, the backend prints the corresponding reset links in its own terminal instead of emailing them.

Seed files must be applied in order. Seed `003_password_reset_tokens.sql` depends on the users created by `001_users.sql`; do not run `003` by itself.

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
4. Keep that project open while following the next steps so you can compare its reference with the CLI's linked project.

The repository's Supabase CLI commands use whichever project is linked in this workspace. The backend uses whichever project is configured in `backend/.env`. Those two targets must be the same test project.

## 2. Sign in and link the Supabase CLI

1. In VS Code, choose **Terminal > New Terminal** from the top menu.
2. Check that the terminal is at the repository root. Its path should end in `project-team-404`, the folder that contains `package.json` and `supabase`. If it is somewhere else, enter:

   ```powershell
   cd C:\Users\Matthew\source\repos\project-team-404
   ```

3. Open VS Code's Command Palette with `Ctrl+Shift+P`, choose **Tasks: Run Task**, and run **🔐 Supabase: Login**. Follow the browser sign-in and authorization steps.
4. Run **🔗 Supabase: Link Project** from the same task menu. Select the dedicated test project you confirmed in step 1. Check the project name/reference shown by the CLI before confirming.
5. If the CLI asks for the database password, enter the password for this test project directly into the terminal prompt. Do not paste it into Postman, this guide, or a chat.

If you cannot confidently identify the linked project as the isolated test project, stop here. Do not push migrations or seed data until you have confirmed it.

## 3. Apply remote migrations and seed fixtures

The remote project needs the repository's database schema before the seed files can run.

1. Run **📊 Supabase: Check Migration Status** from **Tasks: Run Task**. Confirm that the CLI is checking the intended test project.
2. If repository migrations are pending, run **📤 Supabase: Push Migrations**. This applies the repository migrations to the linked remote project. Review any CLI prompt carefully. If it proposes resetting or destructively replacing the database, cancel and ask the project owner before proceeding.
3. Run **🌱 Supabase: Seed Remote (no reset)**. This task checks whether the expected fixtures are already present, runs missing or incorrect seed files, and checks the results. It should report each of these files as `SUCCEEDED` or `SKIPPED`:
   - `001_users.sql`
   - `002_inbox_projects.sql`
   - `003_password_reset_tokens.sql`
   - `004_projects.sql`
   - `005_tasks.sql`
4. If any seed reports `ERROR`, stop and read the message before sending Postman requests. Do not try to fix it by running the destructive remote reset task.

The remote seed task is intentionally not a database reset. It can still modify fixture rows: `001_users.sql` sets the three seeded account passwords to `password123`, and the other seed files create/update the corresponding profiles, projects, tasks, and reset-token rows. This is why the project must be isolated for tests.

Run **🌱 Supabase: Seed Remote (no reset)** again before each new full collection run. The collection invalidates reset tokens and changes James's password during a successful run. Reseeding restores the expected fixture state without resetting the whole remote database.

## 4. Configure the local backend to use the remote project

Postman will call the Express API running on your computer. That local API will connect to the remote Supabase project. You do not need to deploy the API, and you do not need to put Supabase credentials in Postman.

1. In VS Code's Explorer (the files icon on the far-left activity bar), expand `backend` and open `backend/.env`. If the file does not exist, run **🛠️ Setup: Create Environment Files** from **Tasks: Run Task**.
2. In the Supabase Dashboard for the **same test project**, find:
   - The project API URL, usually under **Project Settings > API** or the project overview.
   - A server-side secret/service-role key under **Project Settings > API Keys**. Use the privileged server-side key, not the publishable/anon key.
   - The PostgreSQL connection URI under **Connect** or **Database > Connection string**. Use the connection details for the same project.
3. Set these entries in `backend/.env`:

   | Variable | Value to use |
   | --- | --- |
   | `SUPABASE_URL` | The remote test project's API URL. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Its server-side secret/service-role key. |
   | `DATABASE_URL` | Its PostgreSQL connection URI for the backend. |
   | `DIRECT_URL` | The project's direct PostgreSQL connection URI. If the dashboard provides only one suitable URI for your setup, use that and follow the project's connection guidance. |
   | `NODE_ENV` | `development` |
   | `PORT` | `3000` |
   | `WEB_APP_URL` | `http://localhost:4200` |
   | `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` |

   Use the connection strings shown by the Supabase Dashboard; do not copy the example values from `backend/.env.example`. The database URI contains a password. Keep it private. If Supabase offers more than one connection mode, follow its Prisma-compatible connection guidance; the backend needs a working PostgreSQL connection to the same test project.
4. Confirm the project reference in `SUPABASE_URL` matches the project you linked in step 2 and seeded in step 3. Confirm the database URI is also for that same project. A URL from one project and a database URI from another will cause confusing login and token failures.
5. Remove or comment out the Brevo settings in `backend/.env`, especially:

   ```dotenv
   BREVO_API_KEY=...
   BREVO_SENDER_EMAIL=...
   ```

   Delete those lines or add `#` at the beginning. Do **not** leave them as empty assignments such as `BREVO_API_KEY=`. The backend rejects supplied empty strings. With both variables absent, the backend uses its console mailer and prints reset links in the backend terminal. The sender-name setting is not needed for this test.
6. Do not put the remote secret key or database URI in the Postman environment. Keep them only in the private backend `.env` file. Do not commit or share that file.
7. Save `backend/.env` with `Ctrl+S`. If the backend is already running, stop it in its terminal with `Ctrl+C` and restart it so it loads the new values.

The `SUPABASE_TEST_*` variables in the example file are for automated integration/E2E runners. The manually run Postman requests use `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` from `backend/.env`.

## 5. Start the frontend and API

1. In VS Code, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, and select **🚀 Dev: Start All**. This starts the frontend and backend in parallel. Keep the Supabase CLI terminal available for its output.
2. Keep the task running while using Postman. Wait for the backend terminal to report that the server is listening on port `3000`. Password reset emails should appear in that backend terminal beginning with text similar to:

   ```text
   Password reset email for james@example.com:
   ```

3. Check the local API by opening this address in a browser:

   ```text
   http://localhost:3000/health
   ```

   If the browser cannot connect, the API is not running on that port. This health check confirms the local API is running; the seeded-token request in Postman will check whether it can also reach the remote database.

## 6. Import the Postman collection and environment

There are two JSON files in this folder:

- `Project-Team-404 API - 267-password-recovery.postman_collection.json`
- `Project-Team-404 Local (267-password-recovery).postman_environment.json`

The collection contains the requests and their tests. The environment contains values the requests refer to, such as `baseUrl` and `jamesEmail`. The environment name says `Local` because the API itself runs locally; it does not mean Supabase is local.

1. In Postman, open the workspace where you want these tests. The left sidebar has sections such as **Collections** and **Environments**.
2. Open Windows File Explorer and navigate to:

   ```text
   C:\Users\Matthew\source\repos\project-team-404\tests\postman\267-password-recovery
   ```

3. Select both JSON files. Click the collection JSON file, then hold `Ctrl` and click the environment JSON file so both are selected.
4. Drag the selected files from File Explorer into the main Postman window and drop them. Postman should show an import preview. Confirm the import.

   Alternatively, click **Import** in Postman, choose **Files**, browse to the folder above, select both JSON files, and confirm.
5. Confirm that the left sidebar shows a collection named **Project-Team-404 API - 267-password-recovery** and an environment named **Project-Team-404 Local (267-password-recovery)**.

### If an older collection is already imported

The collection JSON in this folder contains corrected assertions for the API's actual response shape. If your imported collection still reports that `valid` is undefined for an invalid token, it is probably the older copy.

To update it, right-click only **Project-Team-404 API - 267-password-recovery** in the left sidebar, choose **Delete**, and confirm. This removes the Postman collection only; it does not delete Supabase data. Then import the current collection JSON file again. Keep the environment if it already has the values listed below. Do not delete other collections or environments.

## 7. Select and check the Postman environment

Postman has both collection variables and environment variables. These requests use the **environment**. It is normal for the collection's **Variables** tab to be empty.

1. Find the environment selector near the upper-right corner of Postman. Click it and choose **Project-Team-404 Local (267-password-recovery)**. The environment is also listed under **Environments** in the left sidebar; the selected one should have a check mark.
2. Open that environment's variables. Depending on your Postman version, click its name in the sidebar or use the selector's edit icon.
3. Check the **Current value** column:

   | Variable | Expected value or action |
   | --- | --- |
   | `baseUrl` | `http://localhost:3000/api` |
   | `seedPassword` | `password123` |
   | `jamesEmail` | `james@example.com` |
   | `harveyEmail` | `harvey@example.com` |
   | `alexEmail` | `alex@example.com` |
   | `seedValidResetToken` | `seed-reset-james-valid` |
   | `seedExpiredResetToken` | `seed-reset-james-expired` |
   | `seedUsedResetToken` | `seed-reset-james-used` |
   | `recoveryPassword` | `PostmanRecovery123` |
   | `firstResetToken` | Leave blank until the first manual token-copy step. |
   | `secondResetToken` | Leave blank until the second manual token-copy step. |
   | `resetToken` | Leave blank until the fresh-token copy step. |

4. If `baseUrl` is different, set its current value to `http://localhost:3000/api`. This is the local API URL, not the remote Supabase URL.
5. Save the environment if Postman shows a **Save** button or an unsaved-changes indicator. Some versions save automatically.

## 8. Copy the three reset tokens manually

Postman cannot read text from the backend terminal. The collection therefore cannot automatically fill in the three generated-token variables. You must copy each token from the backend terminal and paste it into the active Postman environment.

The backend prints a reset link similar to:

```text
http://localhost:4200/reset-password?token=LONG_RANDOM_VALUE
```

The environment variable must contain only the token, not the URL. For the
example above:

- Do **not** paste `http://localhost:4200/reset-password?token=LONG_RANDOM_VALUE`.
- Paste only `LONG_RANDOM_VALUE`.

In other words, leave out everything through and including `token=`. Do not
include spaces, a line break, or other terminal text. In your screenshot, the
values for `firstResetToken` and `secondResetToken` include the entire URL, so
Postman is sending the wrong value to the API.

| After sending this request | Paste the token into this environment variable |
| --- | --- |
| `Request first reset link for invalidation check` | `firstResetToken` |
| `Request second reset link and invalidate the first` | `secondResetToken` |
| `Request a fresh reset link` | `resetToken` |

Each new reset-link request invalidates earlier unused reset tokens for James. Capture the token immediately after each request. Do not use the first or second token for the final password reset; that request needs the separate fresh token in `resetToken`.

For request 12 specifically, `secondResetToken` must be the bare token from
the console output printed immediately after request 10. Send requests 11 and
12 before sending any other reset-link request for James. A later reset-link
request invalidates that second token, even if its value was copied correctly.

## 9. Send the requests in order

Do not start by clicking the collection's large **Run** button. A collection run sends requests automatically and cannot pause while you copy a token from the backend terminal. Send requests one at a time instead.

1. In the left sidebar under **Collections**, click the small arrow beside **Project-Team-404 API - 267-password-recovery** to expand it.
2. Expand the **267-password-recovery** folder beneath it.
3. Click the first request. Its request editor opens in the main area.
4. Check that the environment selector at the upper right still shows **Project-Team-404 Local (267-password-recovery)**.
5. Click the blue **Send** button. Look at the response status and the test results in the lower response area. Depending on your Postman version, the results may be under **Test Results**.
6. Continue by clicking and sending each next request in order. Follow the list below. Pause at requests 9, 10, and 13 to copy the tokens as described in section 8.

| Order | Request | Expected result or action |
| ---: | --- | --- |
| 1 | Validate seeded valid reset token | `200`; response has `valid: true`. |
| 2 | Missing reset token is rejected | `400`; response has an `error`. |
| 3 | Unknown reset token reports invalid reason | `400`; response has `reason: "invalid"`. |
| 4 | Seeded expired reset token reports expired reason | `400`; response has `reason: "expired"`. |
| 5 | Request reset for known James email | `200`; a reset link may print in the backend terminal. This is not the token-copy step for the later invalidation test. |
| 6 | Request reset for unknown email returns same response | `200`; the response should not reveal whether the account exists. |
| 7 | Invalid email is rejected | `400`. |
| 8 | Seeded used reset token reports used reason | `400`; response has `reason: "used"`. |
| 9 | Request first reset link for invalidation check | `200`; copy its terminal token to `firstResetToken` now. |
| 10 | Request second reset link and invalidate the first | `200`; copy its terminal token to `secondResetToken` now. |
| 11 | First reset token is invalidated by the second request | `400`; response has `reason: "invalid"`. |
| 12 | Second reset token remains valid | `200`; response has `valid: true`. |
| 13 | Request a fresh reset link | `200`; copy its terminal token to `resetToken` now. |
| 14 | Validate fresh reset token copied from console | `200`; response has `valid: true`. |
| 15 | Login before reset (session will be revoked) | `200`; logs in with James's seeded password and saves a session token. |
| 16 | Reset James password with fresh token | `200`; response says `Password updated successfully.` |
| 17 | Replay of successful reset token is rejected | `400`; a used reset token cannot be used again. |
| 18 | Mismatched confirmation is rejected | `400`. |
| 19 | Password under 8 characters is rejected | `400`. |
| 20 | Expired reset token is rejected | `400`. |
| 21 | New password works after reset | `200`; logs in with `PostmanRecovery123` and saves a new session token. |
| 22 | Old password no longer works | `401`; `password123` should not log in until it is restored. |
| 23 | Session issued before reset was revoked | `401`; the old session must no longer work. |
| 24 | Restore seeded James password after recovery checks | `200`; changes James's password back to `password123`. |

### Enter a token in the environment

After sending each of requests 9, 10, and 13, copy the bare token from the
matching output immediately. Do not use the most recent link in the terminal
if it was printed for a different request:

1. Leave the backend terminal open and locate the newest `Password reset email for james@example.com:` output.
2. Find the reset URL on the following line. Copy only the text after `token=` through the end of the token.
3. Return to Postman and open the selected environment's variables.
4. Find the matching row: `firstResetToken`, `secondResetToken`, or `resetToken`.
5. Click its **Current value** cell and paste the token. Save the environment if Postman asks.
6. Return to the collection and send the next request in order.

If the terminal contains several reset emails, use the newest one printed immediately after the request you just sent. A later request can invalidate a previous token.

For the failure at request 12, clear both `firstResetToken` and
`secondResetToken`, then run this short sequence without sending another reset
request in between:

1. Send request 9 and paste only its token value into `firstResetToken`.
2. Send request 10 and paste only its token value into `secondResetToken`.
3. Send requests 11 and 12. Request 11 should return `400`; request 12 should
   return `200` with `valid: true`.

## 10. Restore the remote test account if a run stops early

The last request restores James's password only if the collection reaches it. If the password-reset request succeeded but the collection stopped before the final request, James's password may still be `PostmanRecovery123`.

Preferred recovery:

1. If needed, send **New password works after reset** with `PostmanRecovery123`. A successful response saves a new session token as the environment variable `tokenB`.
2. Send **Restore seeded James password after recovery checks**. It uses `tokenB` and changes the password back to `password123`.
3. Before another full collection run, run **🌱 Supabase: Seed Remote (no reset)** again. This restores all expected seed fixtures, including the valid reset token that the previous run invalidated.

If you cannot restore the account through Postman, stop and confirm that the CLI and backend still point at the dedicated test project. The remote seed task can restore the fixture state without dropping the database, but it may update the test users and fixture rows. Do not run **Supabase: Reset REMOTE DB (destructive)**.

## 11. Common failures

| What Postman shows | Likely cause and next step |
| --- | --- |
| `Could not get any response` or connection refused | The local backend is stopped, or `baseUrl` has the wrong port. Start the backend and check for `http://localhost:3000/api`. |
| A forgot-password request returns `500` | Check the backend terminal for `Unhandled API error`. Confirm `DATABASE_URL` and `SUPABASE_URL` are for the same remote test project, the migrations and seed task succeeded, and the Brevo lines were removed. |
| A known seeded token fails validation | The remote database may not have been seeded, or the backend's `DATABASE_URL` may point to a different project. Check the selected CLI project and `backend/.env`; rerun the non-reset remote seed task if appropriate. |
| A valid second or fresh token returns `400` | The matching environment variable may be blank, may contain the full URL instead of only the token, or may contain an older token. Repeat that reset request and paste its newest token into the correct variable. |
| An invalid-token test says `valid` is undefined | The imported Postman collection is old. Reimport the current collection JSON from this folder. Invalid-token responses use `reason`, not `valid: false`. |
| James login returns `401` with `password123` | The API may be using a different Supabase Auth project, or an earlier run changed James's password. Verify the backend's remote project settings and run the non-reset remote seed task for the confirmed test project. |
| The backend exits after Brevo was removed | Check that `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` are removed/commented out, not present as empty values. Restart the backend. |
| Seeded login fails but seed-token validation passes | `DATABASE_URL` may point to the seeded project while `SUPABASE_URL` points to another Auth project. Both must identify the same test project. |
| A migration or seed task reports an error | Stop. Read the full CLI output and confirm the linked project reference before trying again. Do not use a remote reset to get past the error. |

## What a successful run looks like

Successful operations return `200`. Expected rejections return `400` or `401`, and their corresponding Postman tests should pass. A `400` or `401` is not automatically a failure: for example, an expired token should return `400`, and the old password should return `401` after a successful reset.

At the end, James can log in to the dedicated remote test project with `password123`. The project remains remote; no Docker or local Supabase database is used.
