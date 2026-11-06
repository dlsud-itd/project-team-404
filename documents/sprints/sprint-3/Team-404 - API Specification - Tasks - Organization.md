# HabitFlow API Specification

Team-404
Version 1.1
Last Updated: 2026, Nov. 06
Prepared by: Team-404 API Review

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

| Status | Type    | Field | Description |
| ------ | ------- | ----- | ----------- |
| `204`  | `empty` | —     | No content. |

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

| Item        | Value                                  |
| ----------- | -------------------------------------- |
| Endpoint    | `/api/labels`                          |
| Method      | `GET`                                  |
| Description | Lists the authenticated user’s labels. |

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

| Item        | Value                            |
| ----------- | -------------------------------- |
| Endpoint    | `/api/labels/{labelId}`          |
| Method      | `PUT`                            |
| Description | Updates a label’s name or color. |

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

| Status | Type    | Field | Description |
| ------ | ------- | ----- | ----------- |
| `204`  | `empty` | —     | No content. |
