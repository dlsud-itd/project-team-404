# Labels & Priorities Postman Guide: Remote Supabase

This guide explains how to run the labels and priorities Postman collection against a dedicated remote Supabase test project. It assumes a local Express API at `http://localhost:3000/api`, as configured in the selected Postman environment.

## Can I run the collection all at once?

**Yes. Run all 26 requests in the `342-labels-priorities` folder in one Collection Runner session.** Select the `342-labels-priorities` environment and run the folder in order. The collection logs in as James and Harvey, restores Medium as James's baseline default, creates priority, task, and label fixtures, and saves IDs for the later checks.

Do not reorder or skip the setup requests. The later checks rely on IDs, tokens, and the generated `runId` created by earlier requests.

## Important safety warning

Use a dedicated, isolated Supabase project for testing. Do not use production or a shared development project. These requests create real priorities, labels, and tasks, and they can delete or reassign user data.

## What the collection uses

The collection logs in as James and Harvey using the seeded credentials from `supabase/seeds/001_users.sql`:

| Account | Email | Password |
| --- | --- | --- |
| James | `james@example.com` | `password123` |
| Harvey | `harvey@example.com` | `password123` |

The API uses the database and auth credentials configured in `backend/.env`, but the Postman environment stores only the local API URL and the generated runtime variables. No secrets are stored in the checked-in environment file.

## Before you begin

1. Start the backend and ensure `http://localhost:3000/health` responds.
2. Make sure the repo dependencies are installed.
3. Confirm the database and auth environment values point to the dedicated test project.

## 1. Import the Postman files

This folder contains:

- `Project-Team-404 API - 342-labels-priorities.postman_collection.json`
- `Project-Team-404 Local (342-labels-priorities).postman_environment.json`

Import both files into Postman.

## 2. Select the environment

Choose the environment named `Project-Team-404 Local (342-labels-priorities)`.

Check these variables before running:

| Variable | Expected value/action |
| --- | --- |
| `baseUrl` | `http://localhost:3000/api` |
| `token` | blank; the James login request sets it |
| `tokenB` | blank; the Harvey login request sets it |
| `runId` | blank; the login step sets it |
| `priorityId` | blank; created during the priority setup |
| `reassignPriorityId` | blank; captured as James's Medium priority |
| `unusedPriorityId` | blank; created for the unused-priority deletion check |
| `priorityTaskId` | blank; created with the custom priority before deletion |
| `taskId` | blank; created during the task setup |
| `labelId` | blank; created during the label setup |
| `otherUserPriorityId` | blank; captured from Harvey's priority list |

## 3. Run all requests in Collection Runner

1. Open the collection and run it in order.
2. Keep all requests selected in the existing order.
3. Use the selected 342 environment.
4. Wait for the summary at the end of the run.

The collection includes expected `400`, `401`, `404`, and `409` responses for validation and authorization cases. They pass when the assertions in the Tests tab pass.

## 4. Request flow

| Order | Request | Expected result |
| ---: | --- | --- |
| 1 | Login - James | `200`; sets `token` and `runId` |
| 2 | Login - Harvey | `200`; sets `tokenB` |
| 3 | Get Harvey priorities for ownership check | `200`; captures a Harvey priority ID |
| 4 | Get James priorities and capture Medium | `200`; verifies Low, Medium, and High and saves Medium's ID |
| 5 | Restore Medium as default baseline | `200`; restores Medium as the default after an interrupted prior run |
| 6 | Create James custom priority | `201`; sets `priorityId` |
| 7 | Rename priority | `200` |
| 8 | Recolor priority | `200` |
| 9 | Set default priority | `200` |
| 10 | Duplicate priority name returns 409 | `409` |
| 11 | Create unused priority for delete check | `201`; sets `unusedPriorityId` |
| 12 | Create task with custom priority | `201`; sets `priorityTaskId` |
| 13 | Delete unused priority | `200` |
| 14 | Delete used priority without reassign | `409` |
| 15 | Delete used priority with reassign | `200` |
| 16 | Deleted priority is no longer accessible | `404` |
| 17 | Create task without priority uses default | `201`; uses the reassigned Medium priority |
| 18 | Legacy priority name still works on task create | `201`; returns the built-in string |
| 19 | Another user's priority ID fails on task | `400` |
| 20 | Another user's priority ID returns 404 on /priorities | `404` |
| 21 | Create a label | `201`; sets `labelId` |
| 22 | List labels has taskCount and sortOrder | `200` |
| 23 | Get created label | `200` |
| 24 | Update created label | `200`; updates its name and color |
| 25 | Delete created label | `204` |
| 26 | 401 without token | `401` |

## 5. Common failures

| Problem | Check |
| --- | --- |
| `401` on login or protected routes | Confirm the backend is running and the environment has the correct `baseUrl` |
| `404` for priority or label IDs | Re-run the earlier setup requests in order |
| Priority tests fail on rerun | Use a fresh `runId` from the first login |
| The backend rejects a valid request | Confirm `priorityId` / `labelId` values belong to the authenticated user |

The collection deletes the temporary priorities and label it creates. Its task fixtures remain in the test database; use only the dedicated isolated test project. The checked-in Postman environment contains no credentials.
