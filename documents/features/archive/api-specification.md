# Archive API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

The Archive API lists archived tasks, projects, and labels for the authenticated user. Archiving, restoring, and permanently deleting an item use the owning resource's API rather than a separate Archive write endpoint.

All paths below are rooted at `/api`. Except for public authentication endpoints, requests require the caller's bearer token. Resource access is scoped to the authenticated user.

## Endpoints

| Method   | Endpoint                           | Purpose                                                           | Contract                                                                               |
| -------- | ---------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET`    | `/api/archive`                     | List archived items; accepts type, cursor, and page-size filters. | [Archive and filtering API specification](../../sprints/sprint-5/api-specification.md) |
| `PUT`    | `/api/tasks/:taskId/archive`       | Archive or restore an owned task.                                 | [Task organization API specification](../tasks/api-specification.md)                   |
| `PUT`    | `/api/projects/:projectId/archive` | Archive or restore an owned project.                              | [Project API specification](../projects/api-specification.md)                          |
| `PUT`    | `/api/labels/:labelId/archive`     | Archive or restore an owned label.                                | [Label API specification](../labels/api-specification.md)                              |
| `DELETE` | `/api/tasks/:taskId`               | Permanently delete an archived task; returns `200`.               | [Task API specification](../tasks/api-specification.md)                                |
| `DELETE` | `/api/projects/:projectId`         | Permanently delete an owned project.                              | [Project API specification](../projects/api-specification.md)                          |
| `DELETE` | `/api/labels/:labelId`             | Permanently delete an owned label.                                | [Label API specification](../labels/api-specification.md)                              |

## Common Responses

| Status | Meaning                                                            |
| ------ | ------------------------------------------------------------------ |
| `200`  | Archive listing, archive-state update, or task deletion completed. |
| `204`  | Project or label deletion completed.                               |
| `400`  | Invalid query, path parameter, or request body.                    |
| `401`  | Missing or invalid authentication token.                           |
| `404`  | Item is missing or not owned by the caller.                        |
