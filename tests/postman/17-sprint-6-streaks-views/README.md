# Sprint 6 Streaks, Reordering & Views Postman Guide

This collection verifies the Sprint 6 streak, task-position, board, and timeline contracts against an isolated local API.

## Files

- `Project-Team-404 API - 17-sprint-6-streaks-views.postman_collection.json`
- `Project-Team-404 Local (17-sprint-6-streaks-views).postman_environment.json`

## Safety

Use a disposable local database or dedicated test project. The collection creates one project and two tasks and permanently leaves those fixtures in the database. Do not run it against production or a shared environment.

The seeded accounts are James and Harvey:

| Account | Email | Password |
| --- | --- | --- |
| James | `james@example.com` | `password123` |
| Harvey | `harvey@example.com` | `password123` |

## Setup

1. Start local Supabase and apply migrations/seeds.
2. Configure `backend/.env` for the same database and auth environment.
3. Start the API on port `3000`.
4. Import both JSON files into Postman.
5. Select `Project-Team-404 Local (17-sprint-6-streaks-views)`.
6. Confirm `baseUrl` is `http://localhost:3000/api`.

Leave `token`, `tokenB`, `projectId`, `taskId`, `taskId2`, `activeTaskIds`, `boardActiveIds`, and `boardCompletedIds` blank. Login, setup, and task/board listing requests populate them.

## Run

Run all 20 requests in order in the Collection Runner. The list and board requests capture the complete current task ID sets before reordering. This includes the next occurrence created when the recurring task is completed, avoiding incomplete-set conflicts. Negative cases are expected:

| Status | Cases |
| --- | --- |
| `400` | Invalid streak limit, invalid task ID, invalid timeline range |
| `401` | Missing authentication |
| `404` | Harvey accessing James's project |
| `409` | Incomplete reorder list |

## Coverage

- Task and dashboard streak reads
- Recurring-task completion
- Repeated and missing state transitions
- Project position ordering
- Board and board reordering
- Timeline filtering
- Ownership and authentication boundaries
