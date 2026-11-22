# HabitFlow API Specification

Team-404
Sprint 5: Filtering, Archive, Labels & Priorities, Settings & Search
Version 1.0
Last Updated: 2026, Nov. 10
Prepared by: Team-404 API Review

**Status: Draft for Tech Lead approval.** This document is the Sprint 5 API contract for backend implementation and integration tests. Tech Lead approval is required before Sorting & Filtering Backend Code starts.

All endpoints are rooted at `/api`. Every endpoint in this specification requires `Authorization: Bearer <token>` from `/api/auth/login`. Requests are scoped to the authenticated user. Another user's or a soft-deleted resource is treated as not found.

Shared error body:

```json
{
  "error": "Human-readable description",
  "code": "StableErrorCode"
}
```

| Status | Meaning                                                                  |
| ------ | ------------------------------------------------------------------------ |
| `400`  | Invalid path, query, or request body.                                    |
| `401`  | Missing, invalid, or expired bearer token.                               |
| `404`  | Resource is missing, soft-deleted, or not owned by the caller.           |
| `409`  | Valid request conflicts with resource state or a uniqueness/in-use rule. |

## Endpoint Index

| Area                 | Endpoints                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sorting & Filtering  | `GET /tasks`; `GET /projects`                                                                                                                                                                 |
| Archive              | `PUT /tasks/:taskId/archive`; `PUT /labels/:labelId/archive`; `PUT /projects/:projectId/archive`; `GET /archive`                                                                              |
| Labels & Priorities  | `GET/POST /priorities`; `GET/PUT/DELETE /priorities/:priorityId`; `PUT /priorities/:priorityId/default`; `PUT /priorities/reorder`; task priority fields and endpoint; label CRUD and reorder |
| Settings & Dashboard | `GET/PATCH /settings`; `GET /dashboard/current-upcoming-tasks`; `GET /dashboard/overdue-tasks`; `GET /projects?limit=...`                                                                     |
| Search               | `GET /search`                                                                                                                                                                                 |

## I. Sorting & Filtering

### A. List Tasks

| Item        | Value                                                                                                                                                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/tasks`                                                                                                                                                                                                                                                                                            |
| Method      | `GET`                                                                                                                                                                                                                                                                                                   |
| Auth        | Required bearer token.                                                                                                                                                                                                                                                                                  |
| Description | Lists the caller's tasks. Filters combine with AND except multiple priorities and labels, which follow the matching rules below. Date bounds are inclusive. Archived tasks and tasks in archived projects are excluded by default. Soft-deleted tasks and tasks in deleted projects are never returned. |

#### Task Query Parameters

| Parameter          | Type / allowed values                                                                 | Description                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `projectId`        | Positive integer                                                                      | Restrict results to one caller-owned project.                                                                         |
| `status`           | `all`, `active`, `completed`                                                          | Defaults to `all`; active means not completed.                                                                        |
| `isDone`           | `true`, `false`                                                                       | Legacy completion filter; mutually exclusive with a non-default `status`.                                             |
| `priority`         | `low`, `medium`, `high`                                                               | Backward-compatible single-priority filter. Names resolve case-insensitively against the caller's priority levels.    |
| `priorities`       | Comma-separated priority names                                                        | Multiple values are ORed; maximum 20 distinct values. Legacy `priority` remains supported. Unknown values return 400. |
| `labelId`          | Positive integer                                                                      | Legacy single-label filter, equivalent to one value in `labelIds`.                                                    |
| `labelIds`         | Comma-separated positive integers                                                     | Maximum 50 distinct IDs. `labelMatch=any` requires one match; `all` requires every requested label.                   |
| `labelMatch`       | `any`, `all`                                                                          | Defaults to `any`; applies when labels are supplied.                                                                  |
| `dueFrom`, `dueTo` | `YYYY-MM-DD`                                                                          | Inclusive due-date bounds. Either may be omitted. When both are supplied, `dueFrom` must not be later than `dueTo`.   |
| `hasDueDate`       | `true`, `false`                                                                       | Filters tasks by whether a due date is present.                                                                       |
| `overdue`          | `true`                                                                                | Incomplete tasks whose due date is before today in the user's timezone. Cannot be combined with `status=completed`.   |
| `recurring`        | `true`, `false`                                                                       | Whether recurrence is enabled (not `none`).                                                                           |
| `isArchived`       | `true`, `false`                                                                       | Omitted or false returns active tasks; true returns archived tasks. Archived tasks remain read-only.                  |
| `orderBy`          | `dueDate`, `deadline`, `scheduledDate`, `priority`, `title`, `createdAt`, `updatedAt` | Defaults to `createdAt`. Null dates sort last in either direction. Priority order follows priority `sortOrder`.       |
| `orderDirection`   | `asc`, `desc`                                                                         | Defaults to `asc`. Task ID is the stable final tie-breaker.                                                           |

#### Search Example Request

```http
GET /api/tasks?projectId=18&status=active&priorities=high,low&labelIds=4,9&labelMatch=all&dueFrom=2026-11-10&dueTo=2026-11-30&hasDueDate=true&recurring=false&orderBy=deadline&orderDirection=asc
```

#### Search Success Response

Status `200`; returns an array. Every task object includes `isArchived`, nullable ISO-8601 `archivedAt`, and the priority object `{ id, name, color, sortOrder }`. Existing archived label assignments remain attached and are marked archived.

```json
[
  {
    "id": 41,
    "projectId": 18,
    "title": "Draft sprint recap",
    "isDone": false,
    "priority": { "id": 3, "name": "High", "color": "#D84A4A", "sortOrder": 2 },
    "labels": [
      {
        "id": 4,
        "name": "Planning",
        "color": "#54A6A1",
        "isArchived": false,
        "archivedAt": null
      }
    ],
    "dueDate": "2026-11-12",
    "isArchived": false,
    "archivedAt": null
  }
]
```

#### Search Failure Response

| Status | Description                                                              |
| ------ | ------------------------------------------------------------------------ |
| `400`  | Invalid filter, date, ID, repeated/conflicting parameter, or sort value. |
| `401`  | Missing or invalid token.                                                |

### B. List Projects

| Item        | Value                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/projects`                                                                                                            |
| Method      | `GET`                                                                                                                      |
| Auth        | Required bearer token.                                                                                                     |
| Description | Lists the caller's projects. Deleted projects are never returned. Archived projects are excluded unless `isArchived=true`. |

#### Search Query Parameters

| Parameter        | Type / allowed values                         | Description                                                                      |
| ---------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| `isFavorite`     | `true`, `false`                               | Optional favorite filter.                                                        |
| `isArchived`     | `true`, `false`                               | Optional archive filter; omitted means active only.                              |
| `color`          | `#RRGGBB`                                     | Exact color filter, case-insensitive.                                            |
| `orderBy`        | `sortOrder`, `name`, `createdAt`, `updatedAt` | Defaults to `sortOrder`.                                                         |
| `orderDirection` | `asc`, `desc`                                 | Defaults to `asc`; ID is the stable final tie-breaker.                           |
| `limit`          | Integer 1-100                                 | Optional. Without it, the existing Sprint 2 response and behavior are unchanged. |

#### Task List Example Request

```http
GET /api/projects?isFavorite=true&isArchived=false&color=%23D9F2FF&orderBy=name&orderDirection=asc&limit=10
```

#### Task List Success Response

Status `200`. Without `limit`, returns the existing project array. With `limit`, returns the limited rows and the total matching count:

```json
{
  "projects": [
    {
      "id": 18,
      "name": "Client Work",
      "isInbox": false,
      "isFavorite": true,
      "isArchived": false,
      "archivedAt": null,
      "sortOrder": 1
    }
  ],
  "total": 6
}
```

Every project object includes `isArchived` and nullable ISO-8601 `archivedAt`.

#### Task List Failure Response

| Status | Description                                                 |
| ------ | ----------------------------------------------------------- |
| `400`  | Invalid boolean, color, sort value, or limit outside 1-100. |
| `401`  | Missing or invalid token.                                   |

## II. Archive

Archive is reversible and distinct from soft deletion. Archive listing never includes soft-deleted rows. A null `archivedAt` means active. Archive and restore requests are idempotent.

Archive rules:

- Archived tasks, projects, and labels are omitted from ordinary lists. Archived tasks and tasks in archived projects are omitted from dashboard results and search unless search explicitly includes archives.
- Archived tasks cannot be edited, completed, rescheduled, reprioritized, or relabeled until restored; DELETE remains allowed. An archived recurring task does not create its next occurrence.
- An archived label cannot be newly attached to a task. Existing assignments remain.
- The Inbox project cannot be archived.
- Another user's or a soft-deleted resource returns 404.

### A. Archive or Restore a Task

| Item           | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| Endpoint       | `/api/tasks/:taskId/archive`                                     |
| Method         | `PUT`                                                            |
| Auth           | Required bearer token.                                           |
| Path parameter | `taskId`: positive integer identifying a caller-owned task.      |
| Request body   | Required boolean `isArchived`; true archives and false restores. |

#### Task Archive Example Request

```http
PUT /api/tasks/41/archive
Content-Type: application/json

{ "isArchived": true }
```

#### Task Archive Success Response

Status `200`:

```json
{ "taskId": 41, "isArchived": true, "archivedAt": "2026-11-10T09:30:00.000Z" }
```

#### Task Archive Failure Response

| Status | Description                                          |
| ------ | ---------------------------------------------------- |
| `400`  | Invalid task ID or missing/non-boolean `isArchived`. |
| `401`  | Missing or invalid token.                            |
| `404`  | Task not found, deleted, or not owned by caller.     |

### B. Archive or Restore a Label

| Item           | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| Endpoint       | `/api/labels/:labelId/archive`                                   |
| Method         | `PUT`                                                            |
| Auth           | Required bearer token.                                           |
| Path parameter | `labelId`: positive integer identifying a caller-owned label.    |
| Request body   | Required boolean `isArchived`; true archives and false restores. |

#### Label Archive Example Request

```http
PUT /api/labels/4/archive
Content-Type: application/json

{ "isArchived": true }
```

#### Label Archive Success Response

Status `200`:

```json
{
  "id": 4,
  "name": "Planning",
  "color": "#54A6A1",
  "taskCount": 3,
  "sortOrder": 1,
  "isArchived": true,
  "archivedAt": "2026-11-10T09:30:00.000Z"
}
```

#### Label Archive Failure Response

| Status | Description                                           |
| ------ | ----------------------------------------------------- |
| `400`  | Invalid label ID or missing/non-boolean `isArchived`. |
| `401`  | Missing or invalid token.                             |
| `404`  | Label not found, deleted, or not owned by caller.     |

### C. Archive or Restore a Project

| Item           | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Endpoint       | `/api/projects/:projectId/archive`                                |
| Method         | `PUT`                                                             |
| Auth           | Required bearer token.                                            |
| Path parameter | `projectId`: positive integer identifying a caller-owned project. |
| Request body   | Required boolean `isArchived`; true archives and false restores.  |

#### Project Archive Example Request

```http
PUT /api/projects/18/archive
Content-Type: application/json

{ "isArchived": true }
```

#### Project Archive Success Response

Status `200`. Preserves the Sprint 2 fields and adds nullable `archivedAt`:

```json
{
  "projectId": 18,
  "isArchived": true,
  "archivedAt": "2026-11-10T09:30:00.000Z",
  "message": "Project archived"
}
```

#### Project Archive Failure Response

| Status | Description                                                      |
| ------ | ---------------------------------------------------------------- |
| `400`  | Invalid project ID or missing/non-boolean `isArchived`.          |
| `401`  | Missing or invalid token.                                        |
| `404`  | Project not found, deleted, or not owned by caller.              |
| `409`  | Inbox project cannot be archived (`InboxCannotBeArchivedError`). |

### D. List Archived Items

| Item        | Value                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/archive`                                                                                 |
| Method      | `GET`                                                                                          |
| Auth        | Required bearer token.                                                                         |
| Description | Returns archived items grouped by type, newest archived first. Soft-deleted rows are excluded. |

#### Project Query Parameters

| Parameter | Type / limit                         | Description                                                                        |
| --------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| `type`    | `all`, `tasks`, `projects`, `labels` | Defaults to `all`.                                                                 |
| `limit`   | Integer 1-50                         | Defaults to 20; maximum number of items per page.                                  |
| `cursor`  | Opaque string                        | Optional cursor returned as `nextCursor`; clients must not construct or modify it. |

#### Project List Example Request

```http
GET /api/archive?type=all&limit=20
```

#### Project List Success Response

Status `200`. Every type group is present. Groups not selected by `type` have empty `items` and `total: 0`. Totals count all matching archived rows, not just the current page.

```json
{
  "tasks": {
    "items": [
      {
        "id": 41,
        "title": "Draft sprint recap",
        "isArchived": true,
        "archivedAt": "2026-11-10T09:30:00.000Z",
        "projectId": 18
      }
    ],
    "total": 1
  },
  "projects": { "items": [], "total": 0 },
  "labels": { "items": [], "total": 0 },
  "nextCursor": null
}
```

#### Project List Failure Response

| Status | Description                                       |
| ------ | ------------------------------------------------- |
| `400`  | Unknown type, invalid limit, or malformed cursor. |
| `401`  | Missing or invalid token.                         |

`GET /tasks`, `GET /labels`, and `GET /projects` also accept `isArchived=true` or `isArchived=false`. Omitted means active-only. Every task, label, and project response includes `isArchived` and nullable ISO-8601 `archivedAt`.

## III. Labels & Priorities

### A. Task Priority Object and Assignment

Task create (`POST /api/tasks`) and partial update (`PUT /api/tasks/:taskId`) accept `priorityId` as a positive integer. Omitting it on create selects the caller's default priority. The Sprint 3 `priority` name remains accepted for compatibility; if both fields are supplied they must resolve to the same level. Task responses include `priority: { id, name, color, sortOrder }`, not a hard-coded low/medium/high string.

#### Create Task Example

```http
POST /api/tasks
Content-Type: application/json

{ "title": "Prepare report", "projectId": 18, "priorityId": 2 }
```

Success `201` returns the Sprint 3 task fields with the selected priority object and archive fields:

```json
{
  "id": 41,
  "title": "Prepare report",
  "projectId": 18,
  "priority": { "id": 2, "name": "Medium", "color": "#D59B38", "sortOrder": 1 },
  "isArchived": false,
  "archivedAt": null
}
```

#### Update Task Example

```http
PUT /api/tasks/41
Content-Type: application/json

{ "priorityId": 3 }
```

Success `200` returns the existing update acknowledgement. Task objects returned from task CRUD include the selected priority object and archive fields.

```json
{ "taskId": 41, "message": "Task updated successfully" }
```

#### Set Task Priority

| Item           | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Endpoint       | `/api/tasks/:taskId/priority`                                            |
| Method         | `PUT`                                                                    |
| Auth           | Required bearer token.                                                   |
| Path parameter | Positive integer `taskId`.                                               |
| Request body   | `{ "priorityId": 2 }`; legacy `{ "priority": "high" }` is also accepted. |

Example request:

```http
PUT /api/tasks/41/priority
Content-Type: application/json

{ "priorityId": 3 }
```

Success `200`:

```json
{
  "id": 41,
  "priority": { "id": 3, "name": "High", "color": "#D84A4A", "sortOrder": 2 }
}
```

Task create/update and set-priority errors:

| Status | Description                                                                      |
| ------ | -------------------------------------------------------------------------------- |
| `400`  | Invalid task or priority data; a foreign priorityId is a 400.                    |
| `401`  | Missing or invalid token.                                                        |
| `404`  | Task or project not found, deleted, or not owned by caller; priority not found.  |
| `409`  | Editing, completing, scheduling, reprioritizing, or relabeling an archived task. |

### B. List Priorities

| Item       | Value                  |
| ---------- | ---------------------- |
| Endpoint   | `/api/priorities`      |
| Method     | `GET`                  |
| Auth       | Required bearer token. |
| Parameters | None.                  |

Success `200` returns the caller's priority levels ordered by `sortOrder`, each with task count and default flag. New accounts start with Low, Medium, and High; Medium is the default.

```json
[
  {
    "id": 1,
    "name": "Low",
    "color": "#6E9F79",
    "sortOrder": 0,
    "isDefault": false,
    "taskCount": 2
  },
  {
    "id": 2,
    "name": "Medium",
    "color": "#D59B38",
    "sortOrder": 1,
    "isDefault": true,
    "taskCount": 5
  },
  {
    "id": 3,
    "name": "High",
    "color": "#D84A4A",
    "sortOrder": 2,
    "isDefault": false,
    "taskCount": 1
  }
]
```

Failure: `401` for a missing or invalid token.

### C. Create a Priority

| Item     | Value                  |
| -------- | ---------------------- |
| Endpoint | `/api/priorities`      |
| Method   | `POST`                 |
| Auth     | Required bearer token. |

#### Request Body

| Parameter | Type / limit            | Description                                  |
| --------- | ----------------------- | -------------------------------------------- |
| `name`    | String, 1-50 characters | Trimmed; unique case-insensitively per user. |
| `color`   | Optional `#RRGGBB`      | Hex color.                                   |

Example request:

```json
{ "name": "Urgent", "color": "#C44536" }
```

Success `201`:

```json
{
  "id": 4,
  "name": "Urgent",
  "color": "#C44536",
  "sortOrder": 3,
  "isDefault": false,
  "taskCount": 0
}
```

| Status | Description                                 |
| ------ | ------------------------------------------- |
| `400`  | Invalid name or color.                      |
| `401`  | Missing or invalid token.                   |
| `409`  | Priority name already exists for this user. |

### D. Get, Update, and Delete a Priority

All three routes require a bearer token and a positive integer `priorityId` path parameter.

#### Get Priority

`GET /api/priorities/:priorityId` has no body or query parameters. It returns the priority object, including `isDefault` and `taskCount`, with status `200`.

```http
GET /api/priorities/4
```

```json
{
  "id": 4,
  "name": "Urgent",
  "color": "#C44536",
  "sortOrder": 3,
  "isDefault": false,
  "taskCount": 0
}
```

Errors: `400` invalid ID; `401` missing/invalid token; `404` priority not found or not owned by caller.

#### Update Priority

`PUT /api/priorities/:priorityId` accepts one or both fields: `name` (trimmed string, 1-50 characters) and `color` (`#RRGGBB` or null). Empty updates are invalid.

```http
PUT /api/priorities/4
Content-Type: application/json

{ "name": "Critical", "color": "#B93A32" }
```

Success `200`:

```json
{
  "id": 4,
  "name": "Critical",
  "color": "#B93A32",
  "sortOrder": 3,
  "isDefault": false,
  "taskCount": 0
}
```

Errors: `400` invalid ID/body; `401` missing/invalid token; `404` priority not found/not owned; `409` duplicate name.

#### Delete Priority

`DELETE /api/priorities/:priorityId` accepts optional positive integer query `reassignTo`. An unused priority may be deleted without it. If tasks use the priority, `reassignTo` is required and all those tasks move to the target level. The last priority cannot be deleted. Deleting the default makes the target the default.

```http
DELETE /api/priorities/4?reassignTo=2
```

Success `200`:

```json
{ "deletedId": 4, "reassignedTo": 2, "tasksReassigned": 3 }
```

Errors: `400` invalid ID/query/reassignTo; `401` missing/invalid token; `404` priority or target not found/not owned; `409` used priority without reassignTo, reassignTo is the deleted priority, or this is the last priority.

### E. Set Default Priority

| Item       | Value                                                  |
| ---------- | ------------------------------------------------------ |
| Endpoint   | `/api/priorities/:priorityId/default`                  |
| Method     | `PUT`                                                  |
| Auth       | Required bearer token.                                 |
| Parameters | Positive integer `priorityId` path parameter; no body. |

Example: `PUT /api/priorities/3/default`

Success `200`:

```json
{ "id": 3, "isDefault": true }
```

Errors: `400` invalid ID; `401` missing/invalid token; `404` priority not found/not owned.

### F. Reorder Priorities

| Item         | Value                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Endpoint     | `/api/priorities/reorder`                                                                         |
| Method       | `PUT`                                                                                             |
| Auth         | Required bearer token.                                                                            |
| Request body | `priorityIds` contains every caller-owned priority ID exactly once, with no extras or duplicates. |

```json
{ "priorityIds": [3, 1, 2] }
```

Success `200`:

```json
{ "priorityIds": [3, 1, 2] }
```

Errors: `400` missing IDs, duplicates, unknown IDs, or malformed body; `401` missing/invalid token.

### G. Labels

All label routes require a bearer token. Existing Sprint 3 CRUD remains, with archive and ordering additions. Label names are 1-50 characters; optional colors use `#RRGGBB`.

| Method / path                 | Parameters and request                                                                                 | Success                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `GET /api/labels`             | Optional `isArchived=true` or `isArchived=false`; omitted means active-only. No body.                  | `200` array ordered by `sortOrder`.   |
| `POST /api/labels`            | `{ "name": "Planning", "color": "#54A6A1" }`; name 1-50 chars; color optional `#RRGGBB`.               | `201` created label.                  |
| `PUT /api/labels/:labelId`    | Positive integer ID; optional `name` (1-50 chars) and `color` (`#RRGGBB` or null); at least one field. | `200` updated label.                  |
| `DELETE /api/labels/:labelId` | Positive integer ID; no body.                                                                          | `204` no content.                     |
| `PUT /api/labels/reorder`     | `{ "labelIds": [4, 9, 2] }`; every active caller-owned label exactly once.                             | `200` returns the ordered `labelIds`. |

Each label object includes `taskCount`, `sortOrder`, `isArchived`, and nullable ISO-8601 `archivedAt`.

GET example:

```http
GET /api/labels?isArchived=false
```

```json
[
  {
    "id": 4,
    "name": "Planning",
    "color": "#54A6A1",
    "taskCount": 3,
    "sortOrder": 1,
    "isArchived": false,
    "archivedAt": null
  }
]
```

POST example:

```http
POST /api/labels
Content-Type: application/json

{ "name": "Planning", "color": "#54A6A1" }
```

```json
{
  "id": 4,
  "name": "Planning",
  "color": "#54A6A1",
  "taskCount": 0,
  "sortOrder": 2,
  "isArchived": false,
  "archivedAt": null
}
```

PUT example:

```http
PUT /api/labels/4
Content-Type: application/json

{ "name": "Roadmap" }
```

```json
{
  "id": 4,
  "name": "Roadmap",
  "color": "#54A6A1",
  "taskCount": 3,
  "sortOrder": 1,
  "isArchived": false,
  "archivedAt": null
}
```

Reorder example:

```json
{ "labelIds": [4, 9, 2] }
```

Success `200`:

```json
{ "labelIds": [4, 9, 2] }
```

DELETE example: `DELETE /api/labels/4` returns `204 No Content`.

Errors for label CRUD/reorder: `400` invalid body, label ID, color, or incomplete/duplicate reorder list; `401` missing/invalid token; `404` label not found/deleted/not owned; `409` duplicate label name. Attaching an archived label or changing an archived task through label assignment returns `409`.

## IV. Settings & Dashboard Limits

### A. Get Settings

| Item       | Value                                                                         |
| ---------- | ----------------------------------------------------------------------------- |
| Endpoint   | `/api/settings`                                                               |
| Method     | `GET`                                                                         |
| Auth       | Required bearer token.                                                        |
| Parameters | None. Creates and returns defaults if the user's settings row does not exist. |

Success `200`:

```json
{
  "dashboardTaskLimit": 5,
  "dashboardProjectLimit": 5,
  "fontSize": "medium",
  "fontFamily": "system",
  "updatedAt": "2026-11-10T09:30:00.000Z"
}
```

Failure: `401` missing or invalid token.

### B. Update Settings

| Item        | Value                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------- |
| Endpoint    | `/api/settings`                                                                           |
| Method      | `PATCH`                                                                                   |
| Auth        | Required bearer token.                                                                    |
| Description | Strict partial update; at least one known field is required. Unknown fields are rejected. |

| Body field              | Allowed values                                                        | Default  |
| ----------------------- | --------------------------------------------------------------------- | -------- |
| `dashboardTaskLimit`    | Integer 1-50                                                          | 5        |
| `dashboardProjectLimit` | Integer 1-50                                                          | 5        |
| `fontSize`              | `small`, `medium`, `large`, `x-large`                                 | `medium` |
| `fontFamily`            | `system`, `sans-serif`, `serif`, `monospace`, `atkinson-hyperlegible` | `system` |

Example request:

```json
{ "dashboardTaskLimit": 8, "fontSize": "large", "fontFamily": "serif" }
```

Success `200` returns every field and `updatedAt`:

```json
{
  "dashboardTaskLimit": 8,
  "dashboardProjectLimit": 5,
  "fontSize": "large",
  "fontFamily": "serif",
  "updatedAt": "2026-11-10T09:35:00.000Z"
}
```

Errors: `400` empty body, unknown field, invalid font, or limit outside 1-50; `401` missing/invalid token.

### C. Dashboard Endpoints

Both endpoints require a bearer token and accept optional query `limit` (integer 1-50). Omission uses the caller's `dashboardTaskLimit`. Each response includes `total` for all matching records before limiting; the returned `tasks` list is capped. Current/upcoming date-window fields remain unchanged. Archived tasks, tasks in archived projects, and soft-deleted tasks are omitted.

| Endpoint                                    | Request                                             |
| ------------------------------------------- | --------------------------------------------------- |
| `GET /api/dashboard/current-upcoming-tasks` | `GET /api/dashboard/current-upcoming-tasks?limit=3` |
| `GET /api/dashboard/overdue-tasks`          | `GET /api/dashboard/overdue-tasks?limit=3`          |

Current/upcoming success `200`:

```json
{
  "windowStart": "2026-11-10",
  "windowEnd": "2026-11-17",
  "tasks": [
    {
      "id": 41,
      "title": "Draft sprint recap",
      "dueDate": "2026-11-12",
      "priority": {
        "id": 2,
        "name": "High",
        "color": "#D84A4A",
        "sortOrder": 2
      },
      "isArchived": false,
      "archivedAt": null
    }
  ],
  "total": 6
}
```

Overdue success `200`:

```json
{
  "tasks": [
    {
      "id": 42,
      "title": "Follow up with design",
      "dueDate": "2026-11-04",
      "isArchived": false,
      "archivedAt": null
    }
  ],
  "total": 4
}
```

Errors for both: `400` non-integer or limit outside 1-50; `401` missing/invalid token.

## V. Search

### A. Search Tasks and Projects

| Item        | Value                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| Endpoint    | `/api/search`                                                              |
| Method      | `GET`                                                                      |
| Auth        | Required bearer token.                                                     |
| Description | Searches the caller's tasks and projects. Deleted rows are never searched. |

#### Archive Query Parameters

| Parameter         | Type / limit                     | Description                                                                                                  |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `q`               | Trimmed string, 2-100 characters | Case-insensitive literal search. `%`, `_`, and backslash are treated literally.                              |
| `type`            | `all`, `tasks`, `projects`       | Defaults to `all`.                                                                                           |
| `limit`           | Integer 1-20                     | Defaults to 10 results per group; caps each requested group independently.                                   |
| `includeArchived` | `true`, `false`                  | Defaults to false. Archived tasks and projects, including tasks in archived projects, appear only when true. |

Each matching task or project appears once. Results rank exact title/name matches, then prefix matches, then contains matches; ties use most recently updated. Task results identify the matching field (`title` or `description`) and provide a short snippet.

#### Archive List Example Request

```http
GET /api/search?q=sprint&type=all&limit=10&includeArchived=false
```

#### Archive List Success Response

Status `200`. Both groups and totals are always returned; a group excluded by `type` is empty with total 0. No matches returns empty groups.

```json
{
  "tasks": {
    "items": [
      {
        "id": 41,
        "title": "Draft sprint recap",
        "projectId": 18,
        "matchedField": "title",
        "snippet": "Draft sprint recap",
        "isArchived": false,
        "archivedAt": null
      }
    ],
    "total": 1
  },
  "projects": {
    "items": [
      {
        "id": 18,
        "name": "Sprint Planning",
        "matchedField": "name",
        "snippet": "Sprint Planning",
        "isArchived": false,
        "archivedAt": null
      }
    ],
    "total": 1
  }
}
```

#### Archive List Failure Response

| Status | Description                                                                               |
| ------ | ----------------------------------------------------------------------------------------- |
| `400`  | Missing/short/long `q`, invalid type, limit outside 1-20, or malformed `includeArchived`. |
| `401`  | Missing or invalid token.                                                                 |

## Compatibility Notes

- Legacy Sprint 3 `priority`, `labelId`, and `isDone` task parameters remain accepted.
- Sprint 2 project archive response fields are preserved; `archivedAt` is added.
- Task, label, and project responses expose `isArchived` and nullable `archivedAt`.
- All list and search behavior remains isolated to the authenticated user; no cross-user resource disclosure is permitted.
