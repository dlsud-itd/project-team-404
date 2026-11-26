# Projects API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

Project endpoints are rooted at `/api/projects`. All endpoints require a bearer token and access only projects owned by the authenticated user.

## Endpoints

| Method   | Endpoint                              | Purpose                                        |
| -------- | ------------------------------------- | ---------------------------------------------- |
| `GET`    | `/api/projects`                       | List projects; supports filtering and sorting. |
| `POST`   | `/api/projects`                       | Create a project.                              |
| `GET`    | `/api/projects/:projectId`            | Read an owned project.                         |
| `PATCH`  | `/api/projects/:projectId`            | Update project details.                        |
| `DELETE` | `/api/projects/:projectId`            | Soft-delete an owned project.                  |
| `PUT`    | `/api/projects/reorder`               | Save project order.                            |
| `PUT`    | `/api/projects/:projectId/favorite`   | Set favorite state.                            |
| `PUT`    | `/api/projects/:projectId/archive`    | Archive or restore a project.                  |
| `PUT`    | `/api/projects/:projectId/sort-order` | Set a project's sort order.                    |

## Common Responses

| Status | Meaning                                                  |
| ------ | -------------------------------------------------------- |
| `200`  | List, read, update, or organization operation completed. |
| `201`  | Project created.                                         |
| `204`  | Project deleted.                                         |
| `400`  | Invalid identifier, query, or request body.              |
| `401`  | Missing or invalid authentication token.                 |
| `404`  | Project is missing or not owned by the caller.           |

Field-level contracts are documented in the [Projects API specification](../../sprints/sprint-2/api-specification.md) and [Project organization API specification](../../sprints/sprint-5/api-specification.md).
