# Authentication API Specification

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

Authentication endpoints are rooted at `/api/auth`. Signup, login, availability checks, and password recovery are public. Session, profile, and password-change operations require a valid bearer token.

## Endpoints

| Method  | Endpoint                                   | Auth           | Purpose                                          |
| ------- | ------------------------------------------ | -------------- | ------------------------------------------------ |
| `POST`  | `/api/auth/signup`                         | Public         | Create an account and its initial Inbox project. |
| `GET`   | `/api/auth/check-username/:username`       | Public         | Check username availability.                     |
| `GET`   | `/api/auth/check-email/:email`             | Public         | Check email availability.                        |
| `POST`  | `/api/auth/login`                          | Public         | Verify credentials and issue a session token.    |
| `GET`   | `/api/auth/me`                             | Required       | Return the current authenticated session/user.   |
| `POST`  | `/api/auth/logout`                         | Token optional | Revoke the current session when supplied.        |
| `GET`   | `/api/auth/profile`                        | Required       | Read the caller's profile.                       |
| `PATCH` | `/api/auth/profile`                        | Required       | Update profile fields.                           |
| `PUT`   | `/api/auth/me`                             | Required       | Compatibility route for profile updates.         |
| `POST`  | `/api/auth/profile/password`               | Required       | Change password using the current password.      |
| `POST`  | `/api/auth/forgot-password`                | Public         | Request a password-reset message.                |
| `GET`   | `/api/auth/validate-reset-token?token=...` | Public         | Check whether a reset token is valid.            |
| `POST`  | `/api/auth/reset-password`                 | Public         | Set a new password with a valid reset token.     |

## Common Responses

| Status | Meaning                                                                    |
| ------ | -------------------------------------------------------------------------- |
| `200`  | Read/check/update operation completed.                                     |
| `201`  | Account created.                                                           |
| `400`  | Invalid fields, credentials payload, or reset token input.                 |
| `401`  | Missing or invalid token for a protected endpoint, or invalid credentials. |
| `409`  | Signup conflicts with an existing username or email.                       |

Signup and login request/response shapes and password-recovery contracts are specified in the [Authentication API specification](../../sprints/sprint-1/api-specification.md).
