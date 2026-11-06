# HabitFlow API Specification

Team-404
Version 1.1
Last Updated: 2026, Nov. 06
Prepared by: Team-404 API Review

Endpoints marked with an Authorization parameter require the header `Authorization: Bearer <token>` from `/api/auth/login`.

Every authenticated request only sees data owned by that user.

## I. Tasks (api/tasks)

| Section | Endpoint              | Method   | Purpose                           |
| ------- | --------------------- | -------- | --------------------------------- |
| A       | `/api/tasks`          | `POST`   | Create a new task.                |
| B       | `/api/tasks`          | `GET`    | List tasks with optional filters. |
| C       | `/api/tasks/{taskId}` | `GET`    | Fetch a single task.              |
| D       | `/api/tasks/{taskId}` | `PUT`    | Update task fields.               |
| E       | `/api/tasks/{taskId}` | `DELETE` | Soft-delete a task.               |

### A. Create Task

| Item        | Value                                      |
| ----------- | ------------------------------------------ |
| Endpoint    | `/api/tasks`                               |
| Method      | `POST`                                     |
| Description | Creates a task for the authenticated user. |

#### Request Parameters

| Parameter         | Type     | Description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| title             | string   | Task title (1-200 chars).                                            |
| description       | string   | Optional description (max 1000 chars).                               |
| projectId         | number   | Optional project ID; defaults to the user Inbox when omitted.        |
| scheduledDate     | string   | Optional `YYYY-MM-DD` scheduled date.                                |
| dueDate           | string   | Optional `YYYY-MM-DD` due date.                                      |
| deadline          | string   | Optional ISO 8601 timestamp.                                         |
| recurrence        | string   | Optional `none`, `daily`, `weekly`, or `monthly`.                    |
| recurrenceDays    | number[] | Optional weekdays for weekly recurrence (`0-6`, Sunday to Saturday). |
| recurrenceEndDate | string   | Optional `YYYY-MM-DD` end date for recurring tasks.                  |
| priority          | string   | Optional `low`, `medium`, or `high`.                                 |
| isDone            | boolean  | Optional completion state.                                           |
| doneAt            | string   | Optional ISO 8601 completion timestamp.                              |

#### Success Response

| Status | Type   | Field           | Description                  |
| ------ | ------ | --------------- | ---------------------------- |
| `201`  | `json` | `id`            | New task ID.                 |
| `201`  | `json` | `title`         | Task title.                  |
| `201`  | `json` | `projectId`     | Parent project ID.           |
| `201`  | `json` | `priority`      | Task priority.               |
| `201`  | `json` | `scheduledDate` | `YYYY-MM-DD` or `null`.      |
| `201`  | `json` | `dueDate`       | `YYYY-MM-DD` or `null`.      |
| `201`  | `json` | `deadline`      | ISO timestamp or `null`.     |
| `201`  | `json` | `labels`        | Array of task label objects. |

```json
{
  "id": 41,
  "projectId": 18,
  "title": "Draft sprint recap",
  "description": "Prepare the closing summary",
  "priority": "medium",
  "scheduledDate": "2026-11-07",
  "dueDate": "2026-11-10",
  "deadline": null,
  "recurrence": null,
  "recurrenceDays": [],
  "recurrenceEndDate": null,
  "isDone": false,
  "doneAt": null,
  "labels": []
}
```

#### Failure Response

| Status | Type   | Field   | Description               |
| ------ | ------ | ------- | ------------------------- |
| `400`  | `json` | `error` | Invalid task payload.     |
| `401`  | `json` | `error` | Missing or invalid token. |

### B. List Tasks

| Item        | Value                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| Endpoint    | `/api/tasks`                                                                            |
| Method      | `GET`                                                                                   |
| Description | Lists tasks owned by the authenticated user. Supports project and completion filtering. |

#### Request Parameters

| Parameter     | Type    | Description                             |
| ------------- | ------- | --------------------------------------- |
| Authorization | string  | Bearer token of the authenticated user. |
| projectId     | number  | Optional project filter.                |
| isDone        | boolean | Optional completion filter.             |
| search        | string  | Optional search term.                   |

#### Success Response

| Status | Type   | Field | Description            |
| ------ | ------ | ----- | ---------------------- |
| `200`  | `json` | `[]`  | Array of task objects. |

```json
[
  {
    "id": 41,
    "projectId": 18,
    "title": "Draft sprint recap",
    "description": "Prepare the closing summary",
    "priority": "medium",
    "scheduledDate": "2026-11-07",
    "dueDate": "2026-11-10",
    "deadline": null,
    "recurrence": null,
    "recurrenceDays": [],
    "recurrenceEndDate": null,
    "isDone": false,
    "doneAt": null,
    "labels": []
  }
]
```

### C. Get Task

| Item        | Value                                             |
| ----------- | ------------------------------------------------- |
| Endpoint    | `/api/tasks/{taskId}`                             |
| Method      | `GET`                                             |
| Description | Returns one task owned by the authenticated user. |

#### Success Response

| Status | Type   | Field | Description  |
| ------ | ------ | ----- | ------------ |
| `200`  | `json` | task  | Task object. |

```json
{
  "id": 41,
  "projectId": 18,
  "title": "Draft sprint recap",
  "priority": "medium",
  "dueDate": "2026-11-10",
  "isDone": false
}
```

### D. Update Task

| Item        | Value                                                |
| ----------- | ---------------------------------------------------- |
| Endpoint    | `/api/tasks/{taskId}`                                |
| Method      | `PUT`                                                |
| Description | Replaces or updates task fields in a partial update. |

#### Request Parameters

| Parameter         | Type     | Description                                       |
| ----------------- | -------- | ------------------------------------------------- |
| title             | string   | Optional task title.                              |
| description       | string   | Optional description or `null`.                   |
| projectId         | number   | Optional project reassignment.                    |
| scheduledDate     | string   | Optional `YYYY-MM-DD` or `null`.                  |
| dueDate           | string   | Optional `YYYY-MM-DD` or `null`.                  |
| deadline          | string   | Optional ISO 8601 timestamp or `null`.            |
| recurrence        | string   | Optional `none`, `daily`, `weekly`, or `monthly`. |
| recurrenceDays    | number[] | Optional weekday list for weekly recurrence.      |
| recurrenceEndDate | string   | Optional `YYYY-MM-DD` end date or `null`.         |
| priority          | string   | Optional `low`, `medium`, or `high`.              |
| isDone            | boolean  | Optional mark complete/incomplete.                |
| doneAt            | string   | Optional ISO 8601 completion timestamp or `null`. |

#### Success Response

| Status | Type   | Field         | Description          |
| ------ | ------ | ------------- | -------------------- |
| `200`  | `json` | `id`          | Updated task ID.     |
| `200`  | `json` | `title`       | Updated title.       |
| `200`  | `json` | `description` | Updated description. |
| `200`  | `json` | `updatedAt`   | Updated timestamp.   |

```json
{
  "id": 41,
  "title": "Draft sprint recap",
  "description": "Updated summary for the handoff",
  "priority": "high",
  "updatedAt": "2026-11-06T15:22:00.000Z"
}
```

### E. Delete Task

| Item        | Value                                          |
| ----------- | ---------------------------------------------- |
| Endpoint    | `/api/tasks/{taskId}`                          |
| Method      | `DELETE`                                       |
| Description | Soft-deletes the task by setting `deleted_at`. |

#### Success Response

| Status | Type    | Field | Description |
| ------ | ------- | ----- | ----------- |
| `204`  | `empty` | —     | No content. |

#### Failure Response

| Status | Type   | Field   | Description                          |
| ------ | ------ | ------- | ------------------------------------ |
| `401`  | `json` | `error` | Missing or invalid token.            |
| `404`  | `json` | `error` | Task not found or not owned by user. |
