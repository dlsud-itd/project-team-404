# HabitFlow API Specification

Team-404
Version 1.1
Last Updated: 2026, Nov. 06
Prepared by: Team-404 API Review

## II. Task Scheduling (api/tasks)

| Section | Endpoint                         | Method | Purpose                                       |
| ------- | -------------------------------- | ------ | --------------------------------------------- |
| A       | `/api/tasks/{taskId}/schedule`   | `PUT`  | Set the scheduled date.                       |
| B       | `/api/tasks/{taskId}/due-date`   | `PUT`  | Set the due date.                             |
| C       | `/api/tasks/{taskId}/deadline`   | `PUT`  | Set the deadline timestamp.                   |
| D       | `/api/tasks/{taskId}/recurrence` | `PUT`  | Set recurrence pattern and repeat parameters. |

### A. Set Scheduled Date

| Item        | Value                          |
| ----------- | ------------------------------ |
| Endpoint    | `/api/tasks/{taskId}/schedule` |
| Method      | `PUT`                          |
| Description | Sets a task’s scheduled date.  |

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
| Description | Sets a task’s due date.        |

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
