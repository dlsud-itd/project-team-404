# Priorities API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

Priority endpoints are rooted at `/api/priorities`. All operations require a bearer token and are scoped to the caller's priorities and tasks.

## Endpoints

| Method   | Endpoint                              | Purpose                                                                               |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET`    | `/api/priorities`                     | List caller-owned priorities.                                                         |
| `POST`   | `/api/priorities`                     | Create a priority.                                                                    |
| `GET`    | `/api/priorities/:priorityId`         | Read a priority.                                                                      |
| `PUT`    | `/api/priorities/:priorityId`         | Update a priority.                                                                    |
| `PUT`    | `/api/priorities/:priorityId/default` | Set a priority as the default.                                                        |
| `PUT`    | `/api/priorities/reorder`             | Save the priority order.                                                              |
| `DELETE` | `/api/priorities/:priorityId`         | Delete a priority; the request may specify a replacement priority for assigned tasks. |

## Common Responses

| Status | Meaning                                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| `200`  | List, read, update, reorder, default update, or priority deletion completed; deletion returns the resulting priority. |
| `201`  | Priority created.                                                                                                     |
| `400`  | Invalid identifier, body, order, or delete query.                                                                     |
| `401`  | Missing or invalid authentication token.                                                                              |
| `404`  | Priority is missing or not owned by the caller.                                                                       |
| `409`  | Operation conflicts with current caller-owned priority/task state.                                                    |

For field-level request and response contracts, see [Labels & Priorities](../../sprints/sprint-5/api-specification.md).
