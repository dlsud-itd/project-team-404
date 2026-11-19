# Task Board Postman Guide: Local API

This collection covers the three-column board, filters, status moves, completion side effects, stale reorder requests, and ownership boundaries.

## Safety and setup

Use an isolated local database or dedicated disposable test project. The collection creates projects and tasks and leaves them in the database; it must not be run against production or shared data.

The login requests use the seeded test accounts:

| Account | Email | Password |
| --- | --- | --- |
| James | `james@example.com` | `password123` |
| Harvey | `harvey@example.com` | `password123` |

1. Apply current migrations and seeds, then start the backend configured for the same Supabase/Auth environment.
2. Import both Postman JSON files from this folder.
3. Select **Project-Team-404 Local (19-task-board)** and confirm `baseUrl` is `http://localhost:3000/api`.
4. Leave tokens and generated IDs blank; the setup requests populate them. The environment contains no credentials or tokens.

## Run

Run all requests in the `19-task-board` folder in order with the Collection Runner. Expected negative responses are `400` for invalid status/IDs, `401` without a token, `404` for another user's project or another project task, and `409` for a stale target column.

The positive cases check three columns and counts, position ordering, a priority filter, To Do → In Progress, recurring completion and streak history, movement out of Done, checkbox completion, and within-column reorder.

If Newman is installed, run:

```powershell
newman run "tests/postman/19-task-board/Project-Team-404 API - 19-task-board.postman_collection.json" --environment "tests/postman/19-task-board/Project-Team-404 Local (19-task-board).postman_environment.json" --reporters cli
```

Save actual run output as `run-results.txt` and the Postman Runner summary as `runner-summary.png`. Do not save an environment containing real tokens, database URLs, or service keys.
