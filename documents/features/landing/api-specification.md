# Landing API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

The landing page is a public frontend route and does not have a dedicated `/api/landing` endpoint. Its Sign Up and Log In actions navigate to the corresponding authentication screens.

## Related APIs

| Method | Endpoint           | Purpose                           |
| ------ | ------------------ | --------------------------------- |
| `POST` | `/api/auth/signup` | Register a new account.           |
| `POST` | `/api/auth/login`  | Authenticate an existing account. |

The landing page itself makes no API request. These related endpoints are described in the [Authentication API specification](../auth/api-specification.md).
