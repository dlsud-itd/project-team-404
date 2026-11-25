# HabitFlow API Specification

**Version:** 1.1.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

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
  "recurrence": "none",
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
    "recurrence": "none",
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

| Status | Type   | Field     | Description                  |
| ------ | ------ | --------- | ---------------------------- |
| `200`  | `json` | `taskId`  | ID of the updated task.      |
| `200`  | `json` | `message` | `Task updated successfully`. |

```json
{
  "taskId": 41,
  "message": "Task updated successfully"
}
```

### E. Delete Task

| Item        | Value                                          |
| ----------- | ---------------------------------------------- |
| Endpoint    | `/api/tasks/{taskId}`                          |
| Method      | `DELETE`                                       |
| Description | Soft-deletes the task by setting `deleted_at`. |

#### Success Response

| Status | Type   | Field     | Description                  |
| ------ | ------ | --------- | ---------------------------- |
| `200`  | `json` | `message` | `Task deleted successfully`. |

```json
{
  "message": "Task deleted successfully"
}
```

#### Failure Response

| Status | Type   | Field   | Description                          |
| ------ | ------ | ------- | ------------------------------------ |
| `401`  | `json` | `error` | Missing or invalid token.            |
| `404`  | `json` | `error` | Task not found or not owned by user. |

## II. Task Scheduling (api/tasks)

| Section | Endpoint                         | Method | Purpose                                       |
| ------- | -------------------------------- | ------ | --------------------------------------------- |
| A       | `/api/tasks/{taskId}/schedule`   | `PUT`  | Set the scheduled date.                       |
| B       | `/api/tasks/{taskId}/due-date`   | `PUT`  | Set the due date.                             |
| C       | `/api/tasks/{taskId}/deadline`   | `PUT`  | Set the deadline timestamp.                   |
| D       | `/api/tasks/{taskId}/recurrence` | `PUT`  | Set recurrence pattern and repeat parameters. |

### A. Set Scheduled Date

| Item        | Value                                |
| ----------- | ------------------------------------ |
| Endpoint    | `/api/tasks/{taskId}/schedule`       |
| Method      | `PUT`                                |
| Description | Sets a taskÃ¢â‚¬â„¢s scheduled date. |

#### Request Parameters

| Parameter     | Type   | Description             |
| ------------- | ------ | ----------------------- |
| scheduledDate | string | `YYYY-MM-DD` or `null`. |

#### Success Response

| Status | Type   | Field           | Description             |
| ------ | ------ | --------------- | ----------------------- |
| `200`  | `json` | `id`            | Task ID.                |
| `200`  | `json` | `scheduledDate` | Updated scheduled date. |

```json
{
  "id": 41,
  "scheduledDate": "2026-11-07"
}
```

### B. Set Due Date

| Item        | Value                          |
| ----------- | ------------------------------ |
| Endpoint    | `/api/tasks/{taskId}/due-date` |
| Method      | `PUT`                          |
| Description | Sets a taskÃ¢â‚¬â„¢s due date. |

#### Request Parameters

| Parameter | Type   | Description             |
| --------- | ------ | ----------------------- |
| dueDate   | string | `YYYY-MM-DD` or `null`. |

#### Success Response

| Status | Type   | Field     | Description       |
| ------ | ------ | --------- | ----------------- |
| `200`  | `json` | `id`      | Task ID.          |
| `200`  | `json` | `dueDate` | Updated due date. |

```json
{
  "id": 41,
  "dueDate": "2026-11-10"
}
```

### C. Set Deadline

| Item        | Value                                          |
| ----------- | ---------------------------------------------- |
| Endpoint    | `/api/tasks/{taskId}/deadline`                 |
| Method      | `PUT`                                          |
| Description | Sets a task deadline as an ISO 8601 timestamp. |

#### Request Parameters

| Parameter | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| deadline  | string | ISO 8601 timestamp or `null`. |

#### Success Response

| Status | Type   | Field      | Description       |
| ------ | ------ | ---------- | ----------------- |
| `200`  | `json` | `id`       | Task ID.          |
| `200`  | `json` | `deadline` | Updated deadline. |

```json
{
  "id": 41,
  "deadline": "2026-11-10T18:00:00.000Z"
}
```

### D. Set Recurrence

| Item        | Value                                                                   |
| ----------- | ----------------------------------------------------------------------- |
| Endpoint    | `/api/tasks/{taskId}/recurrence`                                        |
| Method      | `PUT`                                                                   |
| Description | Updates the recurrence pattern, days, and optional end date for a task. |

#### Request Parameters

| Parameter         | Type     | Description                              |
| ----------------- | -------- | ---------------------------------------- |
| recurrence        | string   | `none`, `daily`, `weekly`, or `monthly`. |
| recurrenceDays    | number[] | Days 0-6 for weekly recurrence.          |
| recurrenceEndDate | string   | `YYYY-MM-DD` or `null`.                  |

#### Success Response

| Status | Type   | Field               | Description                   |
| ------ | ------ | ------------------- | ----------------------------- |
| `200`  | `json` | `id`                | Task ID.                      |
| `200`  | `json` | `recurrence`        | Updated recurrence pattern.   |
| `200`  | `json` | `recurrenceDays`    | Sorted weekday list.          |
| `200`  | `json` | `recurrenceEndDate` | Optional recurrence end date. |

```json
{
  "id": 41,
  "recurrence": "weekly",
  "recurrenceDays": [1, 3, 5],
  "recurrenceEndDate": "2026-12-31"
}
```

#### Failure Response

| Status | Type   | Field   | Description                                                     |
| ------ | ------ | ------- | --------------------------------------------------------------- |
| `400`  | `json` | `error` | Invalid recurrence or invalid combination of recurrence fields. |

## III. Task Organization and Labels (api/tasks, api/labels)

| Section | Endpoint                               | Method   | Purpose                              |
| ------- | -------------------------------------- | -------- | ------------------------------------ |
| A       | `/api/tasks/{taskId}/priority`         | `PUT`    | Update task priority.                |
| B       | `/api/tasks/{taskId}/labels`           | `GET`    | List labels assigned to a task.      |
| C       | `/api/tasks/{taskId}/labels`           | `POST`   | Attach one or more labels to a task. |
| D       | `/api/tasks/{taskId}/labels/{labelId}` | `DELETE` | Detach a label from a task.          |
| E       | `/api/labels`                          | `POST`   | Create a label.                      |
| F       | `/api/labels`                          | `GET`    | List labels owned by the user.       |
| G       | `/api/labels/{labelId}`                | `PUT`    | Update a label.                      |
| H       | `/api/labels/{labelId}`                | `DELETE` | Delete a label.                      |

### A. Set Task Priority

| Item        | Value                            |
| ----------- | -------------------------------- |
| Endpoint    | `/api/tasks/{taskId}/priority`   |
| Method      | `PUT`                            |
| Description | Updates the task priority level. |

#### Request Parameters

| Parameter | Type   | Description                 |
| --------- | ------ | --------------------------- |
| priority  | string | `low`, `medium`, or `high`. |

#### Success Response

| Status | Type   | Field      | Description             |
| ------ | ------ | ---------- | ----------------------- |
| `200`  | `json` | `id`       | Task ID.                |
| `200`  | `json` | `priority` | Updated priority level. |

```json
{
  "id": 41,
  "priority": "high"
}
```

### B. List Task Labels

| Item        | Value                            |
| ----------- | -------------------------------- |
| Endpoint    | `/api/tasks/{taskId}/labels`     |
| Method      | `GET`                            |
| Description | Lists labels assigned to a task. |

#### Success Response

| Status | Type   | Field | Description             |
| ------ | ------ | ----- | ----------------------- |
| `200`  | `json` | `[]`  | Array of label objects. |

```json
[
  {
    "id": 5,
    "name": "Design",
    "color": "#B4E1FF"
  }
]
```

### C. Attach Labels

| Item        | Value                                             |
| ----------- | ------------------------------------------------- |
| Endpoint    | `/api/tasks/{taskId}/labels`                      |
| Method      | `POST`                                            |
| Description | Attaches one or more user-owned labels to a task. |

#### Request Parameters

| Parameter | Type     | Description              |
| --------- | -------- | ------------------------ |
| labelIds  | number[] | IDs of labels to attach. |

#### Success Response

| Status | Type   | Field      | Description                    |
| ------ | ------ | ---------- | ------------------------------ |
| `200`  | `json` | `labelIds` | Current label IDs on the task. |

```json
{
  "labelIds": [1, 5, 8]
}
```

### D. Detach Label

| Item        | Value                                          |
| ----------- | ---------------------------------------------- |
| Endpoint    | `/api/tasks/{taskId}/labels/{labelId}`         |
| Method      | `DELETE`                                       |
| Description | Removes a single label assignment from a task. |

#### Success Response

| Status | Type    | Field   | Description |
| ------ | ------- | ------- | ----------- |
| `204`  | `empty` | Ã¢â‚¬â€ | No content. |

### E. Create Label

| Item        | Value                                       |
| ----------- | ------------------------------------------- |
| Endpoint    | `/api/labels`                               |
| Method      | `POST`                                      |
| Description | Creates a label for the authenticated user. |

#### Request Parameters

| Parameter | Type   | Description                         |
| --------- | ------ | ----------------------------------- |
| name      | string | Label name (1-50 chars).            |
| color     | string | Optional hex color, e.g. `#B4E1FF`. |

#### Success Response

| Status | Type   | Field   | Description            |
| ------ | ------ | ------- | ---------------------- |
| `201`  | `json` | `id`    | New label ID.          |
| `201`  | `json` | `name`  | Label name.            |
| `201`  | `json` | `color` | Label color or `null`. |

```json
{
  "id": 5,
  "name": "Design",
  "color": "#B4E1FF"
}
```

### F. List Labels

| Item        | Value                                         |
| ----------- | --------------------------------------------- |
| Endpoint    | `/api/labels`                                 |
| Method      | `GET`                                         |
| Description | Lists the authenticated userÃ¢â‚¬â„¢s labels. |

#### Success Response

| Status | Type   | Field | Description             |
| ------ | ------ | ----- | ----------------------- |
| `200`  | `json` | `[]`  | Array of label objects. |

```json
[
  {
    "id": 5,
    "name": "Design",
    "color": "#B4E1FF"
  }
]
```

### G. Update Label

| Item        | Value                                   |
| ----------- | --------------------------------------- |
| Endpoint    | `/api/labels/{labelId}`                 |
| Method      | `PUT`                                   |
| Description | Updates a labelÃ¢â‚¬â„¢s name or color. |

#### Request Parameters

| Parameter | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| name      | string | Optional new label name.      |
| color     | string | Optional hex color or `null`. |

#### Success Response

| Status | Type   | Field   | Description    |
| ------ | ------ | ------- | -------------- |
| `200`  | `json` | `id`    | Label ID.      |
| `200`  | `json` | `name`  | Updated name.  |
| `200`  | `json` | `color` | Updated color. |

### H. Delete Label

| Item        | Value                       |
| ----------- | --------------------------- |
| Endpoint    | `/api/labels/{labelId}`     |
| Method      | `DELETE`                    |
| Description | Deletes a user-owned label. |

#### Success Response

| Status | Type    | Field   | Description |
| ------ | ------- | ------- | ----------- |
| `204`  | `empty` | Ã¢â‚¬â€ | No content. |
