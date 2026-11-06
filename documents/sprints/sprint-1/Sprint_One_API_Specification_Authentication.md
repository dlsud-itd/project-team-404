# HabitFlow API Specification

Team-404
Version 1.1
Last Updated: 2026, Nov. 06
Prepared by: Team-404 API Review

Endpoints marked with an Authorization parameter require the header `Authorization: Bearer <token>` from `/api/auth/login`.

Every authenticated request only sees data owned by that user.

## I. Authentication (api/auth)

| Section | Endpoint                              | Method | Purpose                                         |
| ------- | ------------------------------------- | ------ | ----------------------------------------------- |
| A       | `/api/auth/signup`                    | `POST` | Create a new account and default Inbox project. |
| B       | `/api/auth/login`                     | `POST` | Verify credentials and issue a session token.   |
| C       | `/api/auth/check-username/{username}` | `GET`  | Check username availability.                    |
| D       | `/api/auth/check-email/{email}`       | `GET`  | Check email availability.                       |
| E       | `/api/auth/me`                        | `GET`  | Return the authenticated user profile.          |
| F       | `/api/auth/me`                        | `PUT`  | Update the authenticated profile.               |
| G       | `/api/auth/logout`                    | `POST` | End the current session.                        |
| H       | `/api/auth/forgot-password`           | `POST` | Request a password reset email.                 |
| I       | `/api/auth/validate-reset-token`      | `GET`  | Validate a reset token.                         |
| J       | `/api/auth/reset-password`            | `POST` | Set a new password using a valid reset token.   |

### A. User Signup

| Item        | Value                                                 |
| ----------- | ----------------------------------------------------- |
| Endpoint    | `/api/auth/signup`                                    |
| Method      | `POST`                                                |
| Description | Creates a new user account and default Inbox project. |

#### Request Parameters

| Parameter       | Type   | Description                                                         |
| --------------- | ------ | ------------------------------------------------------------------- |
| username        | string | Unique username (1-50 characters).                                  |
| email           | string | Unique email address (max 255 characters; normalized to lowercase). |
| password        | string | User password (minimum 8 characters).                               |
| confirmPassword | string | Must exactly match `password`.                                      |
| timezone        | string | Valid IANA timezone such as `Asia/Manila`.                          |

#### Success Response

| Status | Type   | Field            | Description                                           |
| ------ | ------ | ---------------- | ----------------------------------------------------- |
| `201`  | `json` | `userId`         | Supabase Auth user ID.                                |
| `201`  | `json` | `username`       | Registered username.                                  |
| `201`  | `json` | `email`          | Registered email address.                             |
| `201`  | `json` | `inboxProjectId` | ID of the default Inbox project created for the user. |

```json
{
  "userId": "93976dbd-7fdb-4736-b4a2-7fab0b39d232",
  "username": "habitUser",
  "email": "user@example.com",
  "inboxProjectId": 12
}
```

#### Failure Response

| Status | Type   | Field   | Description                                                                                               |
| ------ | ------ | ------- | --------------------------------------------------------------------------------------------------------- |
| `400`  | `json` | `error` | Validation issue such as invalid email, short password, mismatched confirm password, or invalid timezone. |
| `409`  | `json` | `error` | Username or email conflict message.                                                                       |

```json
{
  "error": "Username is already in use"
}
```

### B. User Login / Verify Credentials

| Item        | Value                                            |
| ----------- | ------------------------------------------------ |
| Endpoint    | `/api/auth/login`                                |
| Method      | `POST`                                           |
| Description | Verifies credentials and issues a session token. |

#### Request Parameters

| Parameter  | Type   | Description                   |
| ---------- | ------ | ----------------------------- |
| identifier | string | Registered email or username. |
| password   | string | User password.                |

#### Success Response

| Status | Type   | Field                 | Description                      |
| ------ | ------ | --------------------- | -------------------------------- |
| `200`  | `json` | `token`               | Bearer authentication token.     |
| `200`  | `json` | `user.id`             | User ID.                         |
| `200`  | `json` | `user.username`       | Username.                        |
| `200`  | `json` | `user.email`          | Email address.                   |
| `200`  | `json` | `user.timezone`       | User timezone.                   |
| `200`  | `json` | `user.inboxProjectId` | ID of the default Inbox project. |

```json
{
  "token": "eyJhbGciOiJIUzI1Ni...",
  "user": {
    "id": "93976dbd-7fdb-4736-b4a2-7fab0b39d232",
    "username": "habitBuilder123",
    "email": "user@example.com",
    "timezone": "Asia/Manila",
    "inboxProjectId": 12
  }
}
```

#### Failure Response

| Status | Type   | Field   | Description                     |
| ------ | ------ | ------- | ------------------------------- |
| `401`  | `json` | `error` | Authentication failure message. |

```json
{
  "error": "Invalid email or password"
}
```

### C. Check Username

| Item        | Value                                       |
| ----------- | ------------------------------------------- |
| Endpoint    | `/api/auth/check-username/{username}`       |
| Method      | `GET`                                       |
| Description | Checks whether a username is already taken. |

#### Request Parameters

| Parameter | Type   | Description                         |
| --------- | ------ | ----------------------------------- |
| username  | string | Username to check (path parameter). |

#### Success Response

| Status | Type   | Field       | Description                                             |
| ------ | ------ | ----------- | ------------------------------------------------------- |
| `200`  | `json` | `available` | `true` if the username is available; otherwise `false`. |

```json
{
  "available": true
}
```

#### Failure Response

| Status | Type   | Field   | Description                               |
| ------ | ------ | ------- | ----------------------------------------- |
| `400`  | `json` | `error` | Validation reason such as invalid length. |

```json
{
  "error": "Username must be between 1 and 50 characters"
}
```

### D. Check Email

| Item        | Value                                          |
| ----------- | ---------------------------------------------- |
| Endpoint    | `/api/auth/check-email/{email}`                |
| Method      | `GET`                                          |
| Description | Checks whether an email is already registered. |

#### Request Parameters

| Parameter | Type   | Description                      |
| --------- | ------ | -------------------------------- |
| email     | string | Email to check (path parameter). |

#### Success Response

| Status | Type   | Field       | Description                                          |
| ------ | ------ | ----------- | ---------------------------------------------------- |
| `200`  | `json` | `available` | `true` if the email is available; otherwise `false`. |

```json
{
  "available": false
}
```

#### Failure Response

| Status | Type   | Field   | Description                                                       |
| ------ | ------ | ------- | ----------------------------------------------------------------- |
| `400`  | `json` | `error` | Validation reason such as invalid email format or invalid length. |

```json
{
  "error": "Email must be valid and no longer than 255 characters"
}
```

### E. Get Current User

| Item        | Value                                                       |
| ----------- | ----------------------------------------------------------- |
| Endpoint    | `/api/auth/me`                                              |
| Method      | `GET`                                                       |
| Description | Returns the authenticated user profile for session restore. |

#### Request Parameters

| Parameter     | Type   | Description                             |
| ------------- | ------ | --------------------------------------- |
| Authorization | string | Bearer token of the authenticated user. |

#### Success Response

| Status | Type   | Field            | Description                             |
| ------ | ------ | ---------------- | --------------------------------------- |
| `200`  | `json` | `id`             | User ID.                                |
| `200`  | `json` | `username`       | Username.                               |
| `200`  | `json` | `email`          | Email address.                          |
| `200`  | `json` | `timezone`       | User timezone.                          |
| `200`  | `json` | `inboxProjectId` | ID of the user’s default Inbox project. |

```json
{
  "id": "93976dbd-7fdb-4736-b4a2-7fab0b39d232",
  "username": "habitBuilder123",
  "email": "user@example.com",
  "timezone": "Asia/Manila",
  "inboxProjectId": 12
}
```

#### Failure Response

| Status | Type   | Field   | Description                         |
| ------ | ------ | ------- | ----------------------------------- |
| `401`  | `json` | `error` | Token missing, invalid, or expired. |

```json
{
  "error": "Token invalid or expired"
}
```

### F. Update Profile

| Item        | Value                                                  |
| ----------- | ------------------------------------------------------ |
| Endpoint    | `/api/auth/me`                                         |
| Method      | `PUT`                                                  |
| Description | Updates the authenticated user’s username or timezone. |

#### Request Parameters

| Parameter     | Type   | Description                                      |
| ------------- | ------ | ------------------------------------------------ |
| Authorization | string | Bearer token of the authenticated user.          |
| username      | string | Optional. New unique username (1-50 characters). |
| timezone      | string | Optional. New valid IANA timezone.               |

#### Success Response

| Status | Type   | Field      | Description       |
| ------ | ------ | ---------- | ----------------- |
| `200`  | `json` | `id`       | User ID.          |
| `200`  | `json` | `username` | Current username. |
| `200`  | `json` | `timezone` | Updated timezone. |

```json
{
  "id": "93976dbd-7fdb-4736-b4a2-7fab0b39d232",
  "username": "habitBuilder123",
  "timezone": "Asia/Manila"
}
```

#### Failure Response

| Status | Type   | Field   | Description                    |
| ------ | ------ | ------- | ------------------------------ |
| `400`  | `json` | `error` | Validation or conflict reason. |
| `401`  | `json` | `error` | Authentication error.          |

```json
{
  "error": "Unauthorized"
}
```

### G. User Logout

| Item        | Value                                                             |
| ----------- | ----------------------------------------------------------------- |
| Endpoint    | `/api/auth/logout`                                                |
| Method      | `POST`                                                            |
| Description | Ends the authenticated session and invalidates the current token. |

#### Request Parameters

| Parameter     | Type   | Description                             |
| ------------- | ------ | --------------------------------------- |
| Authorization | string | Bearer token of the authenticated user. |

#### Success Response

| Status | Type   | Field     | Description          |
| ------ | ------ | --------- | -------------------- |
| `200`  | `json` | `message` | Logout confirmation. |

```json
{
  "message": "Logged out successfully"
}
```

#### Failure Response

| Status | Type   | Field   | Description           |
| ------ | ------ | ------- | --------------------- |
| `401`  | `json` | `error` | Authentication error. |

```json
{
  "error": "Unauthorized"
}
```

### H. Forgot Password

| Item        | Value                                                  |
| ----------- | ------------------------------------------------------ |
| Endpoint    | `/api/auth/forgot-password`                            |
| Method      | `POST`                                                 |
| Description | Requests a password reset email if the account exists. |

#### Request Parameters

| Parameter | Type   | Description               |
| --------- | ------ | ------------------------- |
| email     | string | Registered email address. |

#### Success Response

| Status | Type   | Field     | Description                                |
| ------ | ------ | --------- | ------------------------------------------ |
| `200`  | `json` | `message` | Confirmation that the process has started. |

```json
{
  "message": "If an account exists for that email, a reset link has been sent."
}
```

#### Failure Response

| Status | Type   | Field   | Description                         |
| ------ | ------ | ------- | ----------------------------------- |
| `400`  | `json` | `error` | Invalid request or malformed email. |

```json
{
  "error": "Invalid email address"
}
```

### I. Validate Reset Token

| Item        | Value                                        |
| ----------- | -------------------------------------------- |
| Endpoint    | `/api/auth/validate-reset-token`             |
| Method      | `GET`                                        |
| Description | Checks whether a reset token is still valid. |

#### Request Parameters

| Parameter | Type   | Description                                          |
| --------- | ------ | ---------------------------------------------------- |
| token     | string | Reset token from the emailed link (query parameter). |

#### Success Response

| Status | Type   | Field   | Description                      |
| ------ | ------ | ------- | -------------------------------- |
| `200`  | `json` | `valid` | `true` if the token can be used. |

```json
{
  "valid": true
}
```

#### Failure Response

| Status | Type   | Field    | Description                                              |
| ------ | ------ | -------- | -------------------------------------------------------- |
| `400`  | `json` | `error`  | Reason validation failed.                                |
| `400`  | `json` | `reason` | Optional reason such as `expired`, `used`, or `invalid`. |

```json
{
  "error": "Reset token is invalid",
  "reason": "expired"
}
```

### J. Reset Password

| Item        | Value                                                  |
| ----------- | ------------------------------------------------------ |
| Endpoint    | `/api/auth/reset-password`                             |
| Method      | `POST`                                                 |
| Description | Sets a new password and marks the reset token as used. |

#### Request Parameters

| Parameter       | Type   | Description                                                 |
| --------------- | ------ | ----------------------------------------------------------- |
| token           | string | Valid reset token.                                          |
| newPassword     | string | New password (minimum 8 characters).                        |
| confirmPassword | string | Must match `newPassword`.                                   |
| password        | string | Optional alias for `newPassword` accepted by the validator. |

#### Success Response

| Status | Type   | Field     | Description                                |
| ------ | ------ | --------- | ------------------------------------------ |
| `200`  | `json` | `message` | Confirmation of successful password reset. |

```json
{
  "message": "Password updated successfully."
}
```

#### Failure Response

| Status | Type   | Field   | Description                                                     |
| ------ | ------ | ------- | --------------------------------------------------------------- |
| `400`  | `json` | `error` | Failure reason, including invalid token or mismatched password. |

```json
{
  "error": "This reset link is invalid or has expired."
}
```
