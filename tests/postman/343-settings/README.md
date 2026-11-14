# Settings Postman Guide: Local API

This guide explains how to run the settings Postman collection against the local API used by this repository. It follows the same import and runner pattern as the existing feature folders in `tests/postman`.

## Can I run the collection all at once?

**Yes.** This collection is designed to run as a single Postman Collection Runner session. Select the `343-settings` environment and run the `343-settings` folder in order. The first login request generates a unique `runId`, and the settings requests use that value only for naming and tracking.

## What the collection uses

The collection logs in as James and Harvey using the seeded users in `supabase/seeds/001_users.sql`:

| Account | Email | Password |
| --- | --- | --- |
| James | `james@example.com` | `password123` |
| Harvey | `harvey@example.com` | `password123` |

The collection acts against the local Express API at `http://localhost:3000/api` and stores only runtime values in the environment file. No secret credentials are committed to the repo.

## Before you begin

1. Start the backend with the repository task `🚀 Dev: Start All`.
2. Confirm `http://localhost:3000/health` responds successfully.
3. Open the route collection and select `Project-Team-404 Local (343-settings)`.

## 1. Import the Postman files

This folder contains:

- `Project-Team-404 API - 343-settings.postman_collection.json`
- `Project-Team-404 Local (343-settings).postman_environment.json`

Import both files into Postman. Confirm the collection and environment names match exactly.

## 2. Select and check the environment

The environment must include these values:

| Variable | Expected value/action |
| --- | --- |
| `baseUrl` | `http://localhost:3000/api` |
| `token` | blank until the login request runs |
| `tokenB` | blank until the Harvey login request runs |
| `runId` | blank until the first login runs |
| `taskLimit` | blank until the settings update runs |
| `projectLimit` | blank until the settings update runs |
| `fontSize` | blank until the settings update runs |
| `fontFamily` | blank until the settings update runs |

## 3. Run the collection

1. Confirm the environment is selected.
2. In Postman, open the collection and choose **Run**.
3. Run all requests in the `343-settings` folder in their existing order.
4. Wait for the summary; expected error cases like `400` and `401` are part of the suite and should still pass when the assertions succeed.

## 4. Request flow

| Order | Request | Expected result |
| ---: | --- | --- |
| 1 | Login - James | `200`; sets `token` and `runId` |
| 2 | Login - Harvey | `200`; sets `tokenB` |
| 3 | Get James settings | `200` |
| 4 | Patch task limit | `200` |
| 5 | Patch project limit | `200` |
| 6 | Patch font size and family | `200` |
| 7 | Reject invalid task limit | `400` |
| 8 | Reject invalid font size | `400` |
| 9 | Reject invalid font family | `400` |
| 10 | Reject empty update body | `400` |
| 11 | Reject unauthenticated access | `401` |

## 5. Common failures

| Problem | Check |
| --- | --- |
| `401` on login or settings routes | Confirm the backend is running and the selected environment uses `http://localhost:3000/api` |
| A settings update is rejected | Confirm the keys match the supported schema: `dashboardTaskLimit`, `dashboardProjectLimit`, `fontSize`, and `fontFamily` |
| `400` assertions fail unexpectedly | Confirm the values are within the allowed ranges and enum values defined by the backend validator |

This collection intentionally checks validation and auth guard behavior and is designed for local development testing rather than production data.
