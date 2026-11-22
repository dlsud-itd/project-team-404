# HabitFlow API Specification

Team-404
Version 1.1
Last Updated: 2026, Nov. 06
Prepared by: Team-404 API Review

Endpoints marked with an Authorization parameter require the header `Authorization: Bearer <token>` from `/api/auth/login`.

Every authenticated request only sees data owned by that user.

## I. Projects (api/projects)

| Section | Endpoint                               | Method   | Purpose                                                |
| ------- | -------------------------------------- | -------- | ------------------------------------------------------ |
| A       | `/api/projects`                        | `GET`    | List owned projects, with optional archived filtering. |
| B       | `/api/projects`                        | `POST`   | Create a project.                                      |
| C       | `/api/projects/{projectId}`            | `GET`    | Return a single owned project.                         |
| D       | `/api/projects/{projectId}`            | `PATCH`  | Update a project.                                      |
| E       | `/api/projects/{projectId}`            | `DELETE` | Soft-delete a project.                                 |
| F       | `/api/projects/reorder`                | `PUT`    | Reorder projects in a bulk list.                       |
| G       | `/api/projects/{projectId}/favorite`   | `PUT`    | Set favorite status.                                   |
| H       | `/api/projects/{projectId}/archive`    | `PUT`    | Set archive status.                                    |
| I       | `/api/projects/{projectId}/sort-order` | `PUT`    | Set the project sort order.                            |

### A. List Projects

| Item        | Value                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/projects`                                                                                      |
| Method      | `GET`                                                                                                |
| Description | Returns the authenticated user’s projects. Filters can be applied with `isArchived=true` or `false`. |

#### Request Parameters

| Parameter     | Type    | Description                                                                   |
| ------------- | ------- | ----------------------------------------------------------------------------- |
| Authorization | string  | Bearer token of the authenticated user.                                       |
| isArchived    | boolean | Optional filter. `true` returns archived items; `false` returns active items. |

#### Success Response

| Status | Type   | Field         | Description                         |
| ------ | ------ | ------------- | ----------------------------------- |
| `200`  | `json` | `[]`          | Array of project objects.           |
| `200`  | `json` | `id`          | Project ID.                         |
| `200`  | `json` | `name`        | Project name.                       |
| `200`  | `json` | `description` | Optional description.               |
| `200`  | `json` | `color`       | Hex color such as `#FFAA00`.        |
| `200`  | `json` | `isInbox`     | True for the default Inbox project. |
| `200`  | `json` | `isFavorite`  | Favorite state.                     |
| `200`  | `json` | `isArchived`  | Archive state.                      |
| `200`  | `json` | `sortOrder`   | Project sort order.                 |
| `200`  | `json` | `createdAt`   | ISO datetime.                       |
| `200`  | `json` | `updatedAt`   | ISO datetime.                       |

```json
[
  {
    "id": 17,
    "name": "Inbox",
    "description": null,
    "color": "#D9F2FF",
    "isInbox": true,
    "isFavorite": false,
    "isArchived": false,
    "sortOrder": 0,
    "createdAt": "2026-11-01T09:14:00.000Z",
    "updatedAt": "2026-11-01T09:14:00.000Z"
  }
]
```

#### Failure Response

| Status | Type   | Field   | Description                      |
| ------ | ------ | ------- | -------------------------------- |
| `401`  | `json` | `error` | Missing or invalid bearer token. |
| `400`  | `json` | `error` | Invalid filter value.            |

### B. Create Project

| Item        | Value                                         |
| ----------- | --------------------------------------------- |
| Endpoint    | `/api/projects`                               |
| Method      | `POST`                                        |
| Description | Creates a project for the authenticated user. |

#### Request Parameters

| Parameter   | Type   | Description                             |
| ----------- | ------ | --------------------------------------- |
| name        | string | Project name (1-150 chars).             |
| description | string | Optional description (max 500 chars).   |
| color       | string | Optional hex color in `#RRGGBB` format. |

#### Success Response

| Status | Type   | Field         | Description                             |
| ------ | ------ | ------------- | --------------------------------------- |
| `201`  | `json` | `id`          | Newly created project ID.               |
| `201`  | `json` | `name`        | Project name.                           |
| `201`  | `json` | `description` | Description value.                      |
| `201`  | `json` | `color`       | Hex color.                              |
| `201`  | `json` | `isInbox`     | `false` by default for custom projects. |
| `201`  | `json` | `isFavorite`  | Created favorite state.                 |
| `201`  | `json` | `isArchived`  | Created archive state.                  |
| `201`  | `json` | `sortOrder`   | Sort order.                             |

```json
{
  "id": 18,
  "name": "Client Work",
  "description": "Marketing sprint board",
  "color": "#6D5EF5",
  "isInbox": false,
  "isFavorite": false,
  "isArchived": false,
  "sortOrder": 0
}
```

### C. Get Project

| Item        | Value                                                |
| ----------- | ---------------------------------------------------- |
| Endpoint    | `/api/projects/{projectId}`                          |
| Method      | `GET`                                                |
| Description | Returns one project owned by the authenticated user. |

#### Request Parameters

| Parameter     | Type    | Description                             |
| ------------- | ------- | --------------------------------------- |
| Authorization | string  | Bearer token of the authenticated user. |
| projectId     | integer | Positive project ID.                    |

#### Success Response

| Status | Type   | Field   | Description                           |
| ------ | ------ | ------- | ------------------------------------- |
| `200`  | `json` | project | Project object for the owned project. |

```json
{
  "id": 18,
  "name": "Client Work",
  "description": "Marketing sprint board",
  "color": "#6D5EF5",
  "isInbox": false,
  "isFavorite": false,
  "isArchived": false,
  "sortOrder": 0
}
```

#### Failure Response

| Status | Type   | Field   | Description                                 |
| ------ | ------ | ------- | ------------------------------------------- |
| `401`  | `json` | `error` | Missing or invalid token.                   |
| `404`  | `json` | `error` | Project not found or not owned by the user. |

### D. Update Project

| Item        | Value                               |
| ----------- | ----------------------------------- |
| Endpoint    | `/api/projects/{projectId}`         |
| Method      | `PATCH`                             |
| Description | Updates one or more project fields. |

#### Request Parameters

| Parameter   | Type   | Description                      |
| ----------- | ------ | -------------------------------- |
| name        | string | Optional, 1-150 chars.           |
| description | string | Optional description, or `null`. |
| color       | string | Optional hex color, or `null`.   |

#### Success Response

| Status | Type   | Field         | Description           |
| ------ | ------ | ------------- | --------------------- |
| `200`  | `json` | `id`          | Updated project ID.   |
| `200`  | `json` | `name`        | Updated project name. |
| `200`  | `json` | `description` | Updated description.  |
| `200`  | `json` | `color`       | Updated color.        |
| `200`  | `json` | `isInbox`     | Unchanged inbox flag. |
| `200`  | `json` | `updatedAt`   | Updated timestamp.    |

```json
{
  "id": 18,
  "name": "Client Work",
  "description": "Updated plan for sprint 2",
  "color": "#00A3FF",
  "isInbox": false,
  "updatedAt": "2026-11-06T15:22:00.000Z"
}
```

#### Failure Response

| Status | Type   | Field   | Description                                   |
| ------ | ------ | ------- | --------------------------------------------- |
| `400`  | `json` | `error` | Invalid update payload or no fields supplied. |
| `401`  | `json` | `error` | Missing or invalid token.                     |

### E. Delete Project

| Item        | Value                                             |
| ----------- | ------------------------------------------------- |
| Endpoint    | `/api/projects/{projectId}`                       |
| Method      | `DELETE`                                          |
| Description | Soft-deletes the project by setting `deleted_at`. |

#### Success Response

| Status | Type    | Field | Description |
| ------ | ------- | ----- | ----------- |
| `204`  | `empty` | —     | No content. |

#### Failure Response

| Status | Type   | Field   | Description                             |
| ------ | ------ | ------- | --------------------------------------- |
| `401`  | `json` | `error` | Missing or invalid token.               |
| `404`  | `json` | `error` | Project not found or not owned by user. |

### F. Reorder Projects

| Item        | Value                                                             |
| ----------- | ----------------------------------------------------------------- |
| Endpoint    | `/api/projects/reorder`                                           |
| Method      | `PUT`                                                             |
| Description | Reorders all non-Inbox projects using a full ordered list of IDs. |

#### Request Parameters

| Parameter  | Type  | Description                           |
| ---------- | ----- | ------------------------------------- |
| projectIds | array | Ordered list of positive project IDs. |

#### Success Response

| Status | Type   | Field        | Description            |
| ------ | ------ | ------------ | ---------------------- |
| `200`  | `json` | `projectIds` | Updated project order. |

```json
{
  "projectIds": [12, 18, 9, 30]
}
```

### G. Set Favorite

| Item        | Value                                           |
| ----------- | ----------------------------------------------- |
| Endpoint    | `/api/projects/{projectId}/favorite`            |
| Method      | `PUT`                                           |
| Description | Sets or clears the favorite flag for a project. |

#### Request Parameters

| Parameter  | Type    | Description     |
| ---------- | ------- | --------------- |
| isFavorite | boolean | Favorite state. |

#### Success Response

| Status | Type   | Field        | Description           |
| ------ | ------ | ------------ | --------------------- |
| `200`  | `json` | `projectId`  | Project ID.           |
| `200`  | `json` | `isFavorite` | Favorite state.       |
| `200`  | `json` | `message`    | Confirmation message. |

```json
{
  "projectId": 18,
  "isFavorite": true,
  "message": "Project added to favorites"
}
```

### H. Set Archived

| Item        | Value                               |
| ----------- | ----------------------------------- |
| Endpoint    | `/api/projects/{projectId}/archive` |
| Method      | `PUT`                               |
| Description | Sets or clears the archived flag.   |

#### Request Parameters

| Parameter  | Type    | Description    |
| ---------- | ------- | -------------- |
| isArchived | boolean | Archive state. |

#### Success Response

| Status | Type   | Field        | Description           |
| ------ | ------ | ------------ | --------------------- |
| `200`  | `json` | `projectId`  | Project ID.           |
| `200`  | `json` | `isArchived` | Archive state.        |
| `200`  | `json` | `message`    | Confirmation message. |

```json
{
  "projectId": 18,
  "isArchived": true,
  "message": "Project archived"
}
```

### I. Set Sort Order

| Item        | Value                                       |
| ----------- | ------------------------------------------- |
| Endpoint    | `/api/projects/{projectId}/sort-order`      |
| Method      | `PUT`                                       |
| Description | Sets the explicit sort order for a project. |

#### Request Parameters

| Parameter | Type   | Description              |
| --------- | ------ | ------------------------ |
| sortOrder | number | Non-negative sort order. |

#### Success Response

| Status | Type   | Field       | Description           |
| ------ | ------ | ----------- | --------------------- |
| `200`  | `json` | `projectId` | Project ID.           |
| `200`  | `json` | `sortOrder` | Updated sort order.   |
| `200`  | `json` | `message`   | Confirmation message. |

```json
{
  "projectId": 18,
  "sortOrder": 2,
  "message": "Project sort order updated"
}
```
