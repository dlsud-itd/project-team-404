# HabitFlow API Specification

Team-404
Version 1.1
Last Updated: 2026, Nov. 06
Prepared by: Team-404 API Review

## IV. Dashboard Views (api/dashboard)

| Section | Endpoint                                | Method | Purpose                                    |
| ------- | --------------------------------------- | ------ | ------------------------------------------ |
| A       | `/api/dashboard/current-upcoming-tasks` | `GET`  | Returns tasks due in the next N days.      |
| B       | `/api/dashboard/overdue-tasks`          | `GET`  | Returns overdue tasks awaiting completion. |

### A. Current & Upcoming Tasks

| Item        | Value                                                                                |
| ----------- | ------------------------------------------------------------------------------------ |
| Endpoint    | `/api/dashboard/current-upcoming-tasks`                                              |
| Method      | `GET`                                                                                |
| Description | Lists current and upcoming tasks for the authenticated user, grouped by date window. |

#### Request Parameters

| Parameter     | Type   | Description                                        |
| ------------- | ------ | -------------------------------------------------- |
| Authorization | string | Bearer token of the authenticated user.            |
| days          | number | Optional look-ahead window, 1-30; defaults to `7`. |

#### Success Response

| Status | Type   | Field         | Description                                |
| ------ | ------ | ------------- | ------------------------------------------ |
| `200`  | `json` | `windowStart` | Beginning of the generated time window.    |
| `200`  | `json` | `windowEnd`   | End of the generated time window.          |
| `200`  | `json` | `tasks`       | Array of current or upcoming task records. |

```json
{
  "windowStart": "2026-11-06",
  "windowEnd": "2026-11-13",
  "tasks": [
    {
      "id": 41,
      "title": "Draft sprint recap",
      "dueDate": "2026-11-10",
      "priority": "medium",
      "isDone": false
    }
  ]
}
```

#### Failure Response

| Status | Type   | Field   | Description                                               |
| ------ | ------ | ------- | --------------------------------------------------------- |
| `400`  | `json` | `error` | Invalid query value such as an out-of-range `days` value. |
| `401`  | `json` | `error` | Missing or invalid token.                                 |

### B. Overdue Tasks

| Item        | Value                                                   |
| ----------- | ------------------------------------------------------- |
| Endpoint    | `/api/dashboard/overdue-tasks`                          |
| Method      | `GET`                                                   |
| Description | Lists incomplete tasks whose due dates are in the past. |

#### Request Parameters

| Parameter     | Type   | Description                             |
| ------------- | ------ | --------------------------------------- |
| Authorization | string | Bearer token of the authenticated user. |

#### Success Response

| Status | Type   | Field   | Description                    |
| ------ | ------ | ------- | ------------------------------ |
| `200`  | `json` | `tasks` | Array of overdue task records. |

```json
{
  "tasks": [
    {
      "id": 42,
      "title": "Follow up with design",
      "dueDate": "2026-11-04",
      "priority": "high",
      "isDone": false
    }
  ]
}
```

#### Failure Response

| Status | Type   | Field   | Description               |
| ------ | ------ | ------- | ------------------------- |
| `400`  | `json` | `error` | Invalid query parameters. |
| `401`  | `json` | `error` | Missing or invalid token. |
