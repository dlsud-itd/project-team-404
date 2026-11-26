# Search API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

Search is a read-only endpoint rooted at `/api/search`. It searches the authenticated user's tasks and projects; results do not include resources owned by other users.

## Endpoint

| Method | Endpoint      | Parameters                                               | Purpose                                   |
| ------ | ------------- | -------------------------------------------------------- | ----------------------------------------- |
| `GET`  | `/api/search` | Validated query text and optional result filters/limits. | Return matching task and project results. |

The endpoint requires a bearer token. Invalid or empty query input returns `400`; successful searches return `200`, including when there are no matches.

The full query and result contract is in the [Search API specification](../../sprints/sprint-5/api-specification.md).
