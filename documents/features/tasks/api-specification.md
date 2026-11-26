# Tasks API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

Task endpoints are rooted at `/api/tasks`. All task operations require a bearer token and are scoped to the authenticated user. Invalid input returns `400`; missing or non-owned tasks return `404`.

## Task CRUD and Organization

| Method   | Endpoint                             | Purpose                                                      |
| -------- | ------------------------------------ | ------------------------------------------------------------ |
| `POST`   | `/api/tasks`                         | Create a task.                                               |
| `GET`    | `/api/tasks`                         | List tasks with optional filtering, sorting, and pagination. |
| `GET`    | `/api/tasks/:taskId`                 | Read a task.                                                 |
| `PUT`    | `/api/tasks/:taskId`                 | Update task fields and completion state.                     |
| `DELETE` | `/api/tasks/:taskId`                 | Delete a task.                                               |
| `PUT`    | `/api/tasks/reorder`                 | Save task positions within a project.                        |
| `PUT`    | `/api/tasks/:taskId/archive`         | Archive or restore a task.                                   |
| `PUT`    | `/api/tasks/:taskId/priority`        | Assign a priority to a task.                                 |
| `GET`    | `/api/tasks/:taskId/labels`          | List labels attached to a task.                              |
| `POST`   | `/api/tasks/:taskId/labels`          | Attach labels to a task.                                     |
| `DELETE` | `/api/tasks/:taskId/labels/:labelId` | Detach a label from a task.                                  |

## Scheduling and Views

| Method | Endpoint                        | Purpose                                      |
| ------ | ------------------------------- | -------------------------------------------- |
| `PUT`  | `/api/tasks/:taskId/schedule`   | Set the scheduled date.                      |
| `PUT`  | `/api/tasks/:taskId/due-date`   | Set or clear the due date.                   |
| `PUT`  | `/api/tasks/:taskId/deadline`   | Set or clear the deadline.                   |
| `PUT`  | `/api/tasks/:taskId/recurrence` | Set the recurrence rule.                     |
| `GET`  | `/api/tasks/board`              | List tasks grouped by board status.          |
| `PUT`  | `/api/tasks/board/reorder`      | Move a task between board columns/positions. |
| `GET`  | `/api/tasks/timeline`           | List tasks in a requested date range.        |
| `GET`  | `/api/tasks/:taskId/streak`     | Read a task's recurring completion streak.   |

## Common Responses

| Status | Meaning                                                                 |
| ------ | ----------------------------------------------------------------------- |
| `200`  | Read, update, task deletion, organization, or view operation completed. |
| `201`  | Task created.                                                           |
| `400`  | Invalid path, query, or request body.                                   |
| `401`  | Missing or invalid authentication token.                                |
| `404`  | Task is missing or not owned by the caller.                             |
| `409`  | A valid reorder or state change conflicts with current task state.      |

Detailed field, query, and response contracts are in the [Task API specification](../../sprints/sprint-3/api-specification.md) and [Task organization, views, and streaks specification](../../sprints/sprint-6/api-specification.md).
