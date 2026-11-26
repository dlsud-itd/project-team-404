# Home API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

Home is a frontend route and does not expose a distinct `/api/home` endpoint. Its dashboard tab reads the Dashboard API and project/task data; the Tasks tab uses the task API.

## APIs Used

| Method | Endpoint                                | Home behavior                                      |
| ------ | --------------------------------------- | -------------------------------------------------- |
| `GET`  | `/api/dashboard/current-upcoming-tasks` | Load current and upcoming items for the dashboard. |
| `GET`  | `/api/dashboard/overdue-tasks`          | Load overdue items.                                |
| `GET`  | `/api/projects`                         | Load projects for navigation and filtering.        |
| `GET`  | `/api/tasks`                            | Load task list data for the Tasks tab.             |
| `POST` | `/api/tasks`                            | Create a task from the Home composer.              |

These endpoints require authentication. Their request and response contracts are maintained in the [Dashboard API specification](../dashboard/api-specification.md), [Project API specification](../projects/api-specification.md), and [Task API specification](../tasks/api-specification.md).
