# Labels API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

Label endpoints are rooted at `/api/labels`. All endpoints require a bearer token and operate only on labels owned by the caller.

## Endpoints

| Method   | Endpoint                       | Purpose                                         |
| -------- | ------------------------------ | ----------------------------------------------- |
| `POST`   | `/api/labels`                  | Create a label.                                 |
| `GET`    | `/api/labels`                  | List labels; supports archived-state filtering. |
| `GET`    | `/api/labels/:labelId`         | Read an owned label.                            |
| `PUT`    | `/api/labels/:labelId`         | Update label details.                           |
| `DELETE` | `/api/labels/:labelId`         | Delete a label.                                 |
| `PUT`    | `/api/labels/:labelId/archive` | Archive or restore a label using `isArchived`.  |

## Common Responses

| Status | Meaning                                                   |
| ------ | --------------------------------------------------------- |
| `200`  | List, read, update, or archive-state operation completed. |
| `201`  | Label created.                                            |
| `204`  | Label deleted.                                            |
| `400`  | Invalid path, query, or request body.                     |
| `401`  | Missing or invalid authentication token.                  |
| `404`  | Label is missing or not owned by the caller.              |
| `409`  | Label name conflicts with an existing caller-owned label. |

Request and response details are in the [Labels API specification](../../sprints/sprint-3/api-specification.md) and the [organization API specification](../../sprints/sprint-5/api-specification.md).
