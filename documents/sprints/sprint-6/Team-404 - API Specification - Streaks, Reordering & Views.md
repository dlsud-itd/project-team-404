# HabitFlow API Specification

Team-404
Sprint 6: Streaks, Reordering & Views
Version 1.0
Last Updated: 2026, Nov. 16
Prepared by: Team-404 API Review

**Status: Draft for Tech Lead approval.** The Tech Lead must approve this single Sprint 6 contract before Task Streaks Backend Code starts; the backend Code rows and integration tests must follow this specification. The streak history/recurrence-series data and task position fields described below are new backend requirements; they are not represented in the current task schema yet.

All endpoints are rooted at `/api`. Every endpoint requires `Authorization: Bearer <token>` from `/api/auth/login`. Requests and all returned resources are scoped to the authenticated user. Another user's, soft-deleted, or archived task is treated as not found unless explicitly stated otherwise.

Shared error body:

```json
{
  "error": "Human-readable description",
  "code": "StableErrorCode"
}
```

| Status | Meaning                                                                                 |
| ------ | --------------------------------------------------------------------------------------- |
| `400`  | Invalid path, query, or request body; invalid or out-of-range values.                   |
| `401`  | Missing, invalid, or expired bearer token.                                              |
| `404`  | Resource is missing, soft-deleted, archived where excluded, or not owned by the caller. |
| `409`  | A valid write conflicts with the current task state or a concurrent change.             |

## Endpoint Index

| Area       | Endpoint                      | Method |
| ---------- | ----------------------------- | ------ |
| Streaks    | `/tasks/:taskId/streak`       | `GET`  |
| Streaks    | `/dashboard/streaks`          | `GET`  |
| Reordering | `/tasks/reorder`              | `PUT`  |
| Reordering | `/tasks` (`orderBy=position`) | `GET`  |
| Board      | `/tasks/board`                | `GET`  |
| Board      | `/tasks/board/reorder`        | `PUT`  |
| Timeline   | `/tasks/timeline`             | `GET`  |

## I. Streaks

Streaks count consecutive scheduled occurrences completed in the authenticated user's timezone. A missed expected occurrence ends the current streak. Non-recurring tasks have a streak of `0` or `1`. Recurring occurrences are grouped by their recurrence series; the backend must persist completion history and a stable series identifier so that completing a generated occurrence contributes to the same streak. Archived and deleted tasks are excluded.

### A. Get a Task Streak

| Item             | Value                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Endpoint         | `/api/tasks/:taskId/streak`                                                                                                   |
| Method           | `GET`                                                                                                                         |
| Auth             | Required bearer token.                                                                                                        |
| Path parameter   | `taskId`: positive integer identifying a caller-owned task occurrence. The response aggregates its recurrence series, if any. |
| Query parameters | None.                                                                                                                         |
| Request body     | None.                                                                                                                         |

#### Task Streak Example Request

```http
GET /api/tasks/41/streak
```

#### Task Streak Success Response

Status `200`:

```json
{
  "taskId": 41,
  "currentStreak": 4,
  "longestStreak": 7,
  "lastCompletedOn": "2026-11-15",
  "nextOccurrenceOn": "2026-11-16",
  "timezone": "America/Los_Angeles"
}
```

`currentStreak` and `longestStreak` are non-negative counts of consecutive expected occurrences. `lastCompletedOn` and `nextOccurrenceOn` are `YYYY-MM-DD` dates in the user's timezone and are `null` when unavailable. The requested `taskId` is returned even when it identifies a generated occurrence in a series.

#### Task Streak Errors

| Status | Description                                                 |
| ------ | ----------------------------------------------------------- |
| `400`  | `taskId` is not a positive integer.                         |
| `401`  | Missing or invalid token.                                   |
| `404`  | Task is missing, archived, deleted, or not owned by caller. |
| `409`  | Not applicable to this read-only endpoint.                  |

### B. Get Dashboard Streaks

| Item            | Value                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint        | `/api/dashboard/streaks`                                                                                                          |
| Method          | `GET`                                                                                                                             |
| Auth            | Required bearer token.                                                                                                            |
| Query parameter | `limit`: integer `1-100`; defaults to `20`. Returns the most recently active streaks first, with task ID as a stable tie-breaker. |
| Request body    | None.                                                                                                                             |

#### Dashboard Streaks Example Request

```http
GET /api/dashboard/streaks?limit=20
```

The endpoint returns recurring task series with at least one recorded completion. Tasks in archived projects, archived tasks, and deleted tasks are excluded. An empty result is a successful response.

#### Dashboard Streaks Success Response

Status `200`:

```json
{
  "streaks": [
    {
      "taskId": 41,
      "title": "Morning review",
      "currentStreak": 4,
      "longestStreak": 7,
      "lastCompletedOn": "2026-11-15",
      "nextOccurrenceOn": "2026-11-16"
    }
  ]
}
```

#### Dashboard Streaks Errors

| Status | Description                                                                           |
| ------ | ------------------------------------------------------------------------------------- |
| `400`  | `limit` is not an integer from `1` through `100`.                                     |
| `401`  | Missing or invalid token.                                                             |
| `404`  | Not applicable; this collection endpoint returns an empty list when no streaks match. |
| `409`  | Not applicable to this read-only endpoint.                                            |

## II. Task Ordering

Task `position` is a non-negative integer ordered within a project and completion column. The initial backfill assigns consecutive positions per user and project. The project reorder endpoint below renumbers active tasks from `1` through `n`; newly created tasks and tasks moved to another project append after the maximum position in the destination project. Archived and deleted tasks do not participate in reordering. `orderBy=position` returns active tasks before completed tasks, then orders by position in the requested direction and by ID ascending for ties.

### A. Reorder Tasks

| Item                  | Value                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Endpoint              | `/api/tasks/reorder`                                                                               |
| Method                | `PUT`                                                                                              |
| Auth                  | Required bearer token.                                                                             |
| Query/path parameters | None.                                                                                              |
| Request body          | `projectId`: positive integer; `taskIds`: a non-empty array of unique positive IDs, maximum `500`. |

`taskIds` must contain every active (incomplete, non-archived, non-deleted) task in the specified project exactly once. Empty lists are rejected. The server validates and updates the complete ordering atomically, assigning positions `1` through `n` in the submitted order.

#### Reorder Tasks Example Request

```http
PUT /api/tasks/reorder
Content-Type: application/json

{
  "projectId": 18,
  "taskIds": [41, 38, 52]
}
```

#### Reorder Tasks Success Response

Status `200`:

```json
{
  "projectId": 18,
  "taskIds": [41, 38, 52]
}
```

#### Reorder Tasks Errors

| Status | Description                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------- |
| `400`  | Missing or malformed fields, an empty list, invalid project/IDs, more than 500 IDs, or duplicate IDs.          |
| `401`  | Missing or invalid token.                                                                                      |
| `404`  | A requested task ID is missing, deleted, archived, outside the project, or not owned by the caller.            |
| `409`  | The list omits one or more active tasks, or the task set changes during the reorder; no positions are changed. |

### B. List Tasks by Position

| Item            | Value                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Endpoint        | `/api/tasks`                                                                                                                                                                                                             |
| Method          | `GET`                                                                                                                                                                                                                    |
| Auth            | Required bearer token.                                                                                                                                                                                                   |
| Query parameter | `orderBy=position`; `orderDirection` is `asc` or `desc` (defaults to `asc`). Existing task filters and pagination remain available; `page` is a positive integer (default `1`) and `pageSize` is `1-100` (default `20`). |
| Request body    | None.                                                                                                                                                                                                                    |

When `orderBy=position`, the server sorts active tasks before completed tasks, then by position according to `orderDirection`, then by task ID ascending. `position` is added to the existing `orderBy` enum. Other `orderBy` values retain their documented behavior.

#### List Tasks Example Request

```http
GET /api/tasks?projectId=18&orderBy=position&orderDirection=asc&page=1&pageSize=20
```

#### List Tasks Success Response

Status `200`; returns the existing task array shape, with the added `position` field:

```json
[
  {
    "id": 41,
    "projectId": 18,
    "title": "Draft sprint recap",
    "isDone": false,
    "position": 1
  }
]
```

#### List Tasks Errors

| Status | Description                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------- |
| `400`  | Unsupported `orderBy`/`orderDirection`, invalid filter, or invalid `page`/`pageSize`.             |
| `401`  | Missing or invalid token.                                                                         |
| `404`  | Not applicable to the collection; a project filter with no matching tasks returns an empty array. |
| `409`  | Not applicable to this read-only endpoint.                                                        |

## III. Board View

The board has two columns: `active` (not completed) and `completed`. Archived and deleted tasks, tasks in archived projects, and tasks outside the authenticated user's scope are omitted. Each column is ordered by its task `position`, then task ID ascending.

### A. Get Task Board

| Item            | Value                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint        | `/api/tasks/board`                                                                                                                          |
| Method          | `GET`                                                                                                                                       |
| Auth            | Required bearer token.                                                                                                                      |
| Query parameter | `projectId`: optional positive integer. When omitted, includes tasks across the user's non-archived projects and Inbox, grouped by project. |
| Request body    | None.                                                                                                                                       |

#### Task Board Example Request

```http
GET /api/tasks/board?projectId=18
```

#### Task Board Success Response

Status `200`:

```json
{
  "projectId": 18,
  "columns": {
    "active": [
      {
        "id": 41,
        "title": "Draft sprint recap",
        "isDone": false,
        "position": 1
      }
    ],
    "completed": [
      {
        "id": 38,
        "title": "Review requirements",
        "isDone": true,
        "position": 2
      }
    ]
  }
}
```

When `projectId` is omitted, the response is `{ "projects": [{ "projectId": 18, "columns": { "active": [], "completed": [] } }] }`. Inbox is represented by `projectId: null`.

#### Task Board Errors

| Status | Description                                                             |
| ------ | ----------------------------------------------------------------------- |
| `400`  | `projectId` is not a positive integer.                                  |
| `401`  | Missing or invalid token.                                               |
| `404`  | Supplied project is missing, archived, deleted, or not owned by caller. |
| `409`  | Not applicable to this read-only endpoint.                              |

### B. Reorder Board Tasks

| Item                  | Value                                                                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint              | `/api/tasks/board/reorder`                                                                                                                                                         |
| Method                | `PUT`                                                                                                                                                                              |
| Auth                  | Required bearer token.                                                                                                                                                             |
| Query/path parameters | None.                                                                                                                                                                              |
| Request body          | Required `projectId` (positive integer or `null` for Inbox); `columns.active` and `columns.completed`, each an ordered array of positive integer IDs. Combined maximum: `500` IDs. |

The two arrays together must contain every non-archived, non-deleted task in the selected project exactly once. Membership must match current completion state: active IDs must have `isDone=false`; completed IDs must have `isDone=true`. Each array may be empty. Ordering is updated atomically; IDs are assigned zero-based positions within their column.

#### Reorder Board Example Request

```http
PUT /api/tasks/board/reorder
Content-Type: application/json

{
  "projectId": 18,
  "columns": {
    "active": [41, 52],
    "completed": [38]
  }
}
```

#### Reorder Board Success Response

Status `200`:

```json
{
  "projectId": 18,
  "columns": {
    "active": [41, 52],
    "completed": [38]
  }
}
```

#### Reorder Board Errors

| Status | Description                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| `400`  | Missing/malformed fields, non-positive IDs, duplicate IDs, more than 500 IDs, or an incomplete/extra ID set.    |
| `401`  | Missing or invalid token.                                                                                       |
| `404`  | Project or task ID is missing, deleted, or not owned by caller.                                                 |
| `409`  | A task's completion state, project, or membership changed since the board was loaded; no positions are changed. |

### C. Completion and Board Column Changes

Completion continues to use `PUT /api/tasks/:taskId` with `{ "isDone": true|false }`. A successful transition to `true` removes the task from `active` and appends it to the end of `completed`; a transition to `false` removes it from `completed` and appends it to the end of `active`. The server sets or clears `doneAt` as appropriate and updates positions atomically. Repeating the current state does not create another move. For recurring tasks, completing an occurrence also creates its next occurrence when allowed; the new occurrence appears at the end of `active` and remains in the same project.

#### Completion Example Request

```http
PUT /api/tasks/41
Content-Type: application/json

{ "isDone": true }
```

#### Completion Success Response

Status `200`:

```json
{
  "id": 41,
  "isDone": true,
  "doneAt": "2026-11-16T09:30:00.000Z",
  "position": 1
}
```

| Status | Description                                                                  |
| ------ | ---------------------------------------------------------------------------- |
| `400`  | Invalid task ID or malformed `isDone` body.                                  |
| `401`  | Missing or invalid token.                                                    |
| `404`  | Task is missing, archived, deleted, or not owned by caller.                  |
| `409`  | Task is archived or the state transition conflicts with a concurrent update. |

## IV. Timeline View

### A. Get Tasks for a Date Range

| Item            | Value                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Endpoint        | `/api/tasks/timeline`                                                                                                                                                    |
| Method          | `GET`                                                                                                                                                                    |
| Auth            | Required bearer token.                                                                                                                                                   |
| Query parameter | `from`: required `YYYY-MM-DD`; `to`: required `YYYY-MM-DD`; `projectId`: optional positive integer; `includeCompleted`: optional `true` or `false`, defaults to `false`. |
| Range limit     | Inclusive date range; `from` must be on or before `to`, and the range may contain at most `366` calendar days.                                                           |
| Request body    | None.                                                                                                                                                                    |

Tasks are included when their `scheduledDate`, `dueDate`, or deadline's calendar date falls within the requested range. A task matching multiple dates is returned once with all relevant date fields. Archived and deleted tasks and tasks in archived projects are excluded. `includeCompleted=true` includes completed tasks; otherwise only incomplete tasks are returned.

#### Timeline Example Request

```http
GET /api/tasks/timeline?from=2026-11-01&to=2026-11-30&projectId=18&includeCompleted=false
```

#### Timeline Success Response

Status `200`:

```json
{
  "from": "2026-11-01",
  "to": "2026-11-30",
  "tasks": [
    {
      "id": 41,
      "projectId": 18,
      "title": "Draft sprint recap",
      "scheduledDate": "2026-11-12",
      "dueDate": "2026-11-14",
      "deadline": null,
      "isDone": false
    }
  ]
}
```

#### Timeline Errors

| Status | Description                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `400`  | Missing or invalid date, `from > to`, range greater than 366 calendar days, malformed `projectId`, or invalid `includeCompleted`. |
| `401`  | Missing or invalid token.                                                                                                         |
| `404`  | Supplied project is missing, archived, deleted, or not owned by caller.                                                           |
| `409`  | Not applicable to this read-only endpoint.                                                                                        |

## V. Implementation Requirements

- Add persistent task position data and make reorder writes transactional. Position is scoped by project and completion state.
- Persist completion events and recurrence-series identity; do not infer streak history only from the current `isDone`/`doneAt` value.
- Recalculate or atomically maintain positions when tasks are completed/un-completed, moved between projects, archived, restored, or deleted.
- Validate all ownership and complete-set constraints before writing any reorder operation. Failed reorder requests must not partially update positions.
