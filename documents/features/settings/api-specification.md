# Settings API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

Settings endpoints are rooted at `/api/settings`. Both operations require a bearer token and read or update only the caller's settings.

## Endpoints

| Method  | Endpoint        | Purpose                                                                      |
| ------- | --------------- | ---------------------------------------------------------------------------- |
| `GET`   | `/api/settings` | Read settings, creating defaults when none exist.                            |
| `PATCH` | `/api/settings` | Partially update validated settings such as appearance and dashboard limits. |

## Common Responses

| Status | Meaning                                            |
| ------ | -------------------------------------------------- |
| `200`  | Settings returned or updated.                      |
| `400`  | Invalid setting value or unsupported update field. |
| `401`  | Missing or invalid authentication token.           |

Field-level settings contracts are documented in [Settings & Dashboard Limits](../../sprints/sprint-5/api-specification.md).
