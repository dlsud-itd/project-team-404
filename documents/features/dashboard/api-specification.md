# Dashboard API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

Dashboard endpoints are rooted at `/api/dashboard`. They return caller-owned task summaries and streak data, scoped to the signed-in user and calculated using the user's timezone where applicable.

## Endpoints

| Method | Endpoint                                | Purpose                                                       |
| ------ | --------------------------------------- | ------------------------------------------------------------- |
| `GET`  | `/api/dashboard/current-upcoming-tasks` | List current and upcoming tasks in the requested date window. |
| `GET`  | `/api/dashboard/overdue-tasks`          | List overdue, incomplete tasks.                               |
| `GET`  | `/api/dashboard/streaks`                | List active recurring-task streak summaries.                  |

All endpoints require a bearer token. Query parameters are validated; invalid date windows, limits, or timezone values return `400`.

## Common Responses

| Status | Meaning                                               |
| ------ | ----------------------------------------------------- |
| `200`  | Dashboard data returned; empty collections are valid. |
| `400`  | Invalid query parameters.                             |
| `401`  | Missing or invalid authentication token.              |

For query and response contracts, see [Dashboard Views](../../sprints/sprint-4/api-specification.md) and [Streaks](../../sprints/sprint-6/api-specification.md).
