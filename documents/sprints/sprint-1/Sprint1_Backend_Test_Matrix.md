# Sprint 1 Backend Test Matrix
Last Updated: October 14, 2026 | Version 1.0.0

## Overview
Backend test cases for Sprint 1 (User Authentication), written before any backend code exists. Every case starts as `Failing` and is updated to `Passing` as each task is completed.

Covers: Registration, Login & Session, Password Recovery, and Profile Management.

Test IDs use the format `BE-<DELIVERABLE>-<NN>`:

| Code | Deliverable |
|---|---|
| REG | Registration |
| LOG | Login & Session |
| REC | Password Recovery |
| PRF | Profile Management |

Status values: `Failing` (default, written before code), `Passing`, `Blocked`.

---

## 1. Registration
### 1.1 Account Creation API
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-REG-01 | POST `/auth/register` with valid payload | 201 Created; creates user in `auth.users` (Supabase managed) and `tbl_user` profile. | Failing |
| BE-REG-02 | Password is hashed before storage | Stored password value is a hash in Supabase, never equal to the plaintext password. | Failing |
| BE-REG-03 | Register with missing username | 400 Bad Request; error identifies `username` as required for `tbl_user`. | Failing |
| BE-REG-04 | Register with missing email | 400 Bad Request; error identifies email as required for `auth.users`. | Failing |
| BE-REG-05 | Register with malformed email (`user@`) | 400 Bad Request; triggers "Verify Email Format" use case and returns "Display Registration Error". | Failing |
| BE-REG-06 | Register with password shorter than minimum | 400 Bad Request; error states the minimum password length. | Failing |
| BE-REG-07 | Register with username containing invalid chars | 400 Bad Request; error says `username` format is invalid. | Failing |
| BE-REG-08 | Register with unexpected extra fields in body | Extra fields are ignored or rejected; no extra data is persisted. | Failing |

### 1.2 Username & Email Availability Check
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-REG-09 | Check availability of an unused username | 200 OK; available: true. | Failing |
| BE-REG-10 | Check availability of an existing username | 200 OK; available: false. | Failing |
| BE-REG-11 | Check availability of an existing email | 200 OK; available: false. | Failing |
| BE-REG-12 | Email check is case-insensitive | `User@Example.com` is reported unavailable when `user@example.com` exists. | Failing |
| BE-REG-13 | Register with a `username` that is already taken | 409 Conflict; no new user row created in `tbl_user`. | Failing |
| BE-REG-14 | Register with an email that is already registered | 409 Conflict; no new user row created in `auth.users`. | Failing |

### 1.3 Default Inbox Project Creation
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-REG-15 | Successful registration creates default Inbox | Exactly one project named "Inbox" is created automatically at signup. | Failing |
| BE-REG-16 | Inbox is flagged as the default project | The created Inbox project has `is_inbox` set to true in `tbl_project`. | Failing |
| BE-REG-17 | Failed registration creates no Inbox | No orphan project rows exist in `tbl_project` after a rejected registration. | Failing |
| BE-REG-18 | Inbox creation failure rolls back the user | If Inbox insert fails, the `tbl_user` and `auth.users` rows are rolled back to prevent inconsistent state. | Failing |

### 1.4 Registration Backend Integration Tests
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-REG-19 | Register against a real Supabase test database | User row and Inbox project row both exist after the request. | Failing |
| BE-REG-20 | Two simultaneous registrations with same email | One returns 201, the other 409; only one user row exists. | Failing |

---

## 2. Login & Session
### 2.1 Login API
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-LOG-01 | POST `/auth/login` with valid email and password | 200 OK; successfully passes the "Verify Credentials" use case and returns session token. | Failing |
| BE-LOG-02 | Login with valid username and password | 200 OK; session token returned. | Failing |
| BE-LOG-03 | Login with wrong password | 401 Unauthorized; generic "invalid credentials" message. | Failing |
| BE-LOG-04 | Login with unknown email | 401 Unauthorized; same message as wrong password (no account enumeration). | Failing |
| BE-LOG-05 | Login with missing password | 400 Bad Request; error identifies password as required. | Failing |
| BE-LOG-06 | Login with missing identifier | 400 Bad Request; error identifies the missing field. | Failing |
| BE-LOG-07 | Login response never exposes the password hash | Response body contains no password or hash field. | Failing |

### 2.2 Session Token Handling
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-LOG-08 | Token utility issues a token for a user | Token is a non-empty string that decodes to the correct `user_id` (UUID). | Failing |
| BE-LOG-09 | Request to a protected route with a valid token | 200 OK; request is attributed to the correct user. | Failing |
| BE-LOG-10 | Request to a protected route with no token | 401 Unauthorized. | Failing |
| BE-LOG-11 | Request with a malformed token | 401 Unauthorized. | Failing |
| BE-LOG-12 | Request with an expired token | 401 Unauthorized; error indicates the session expired. | Failing |
| BE-LOG-13 | Request with a tampered token signature | 401 Unauthorized. | Failing |
| BE-LOG-14 | GET `/auth/me` with a valid token (session restore) | 200 OK; returns the current user profile. | Failing |
| BE-LOG-15 | POST `/auth/logout` with a valid token | 200 or 204; token is no longer accepted afterwards. | Failing |

### 2.3 Login & Session Backend Integration Tests
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-LOG-16 | Register, then log in, against a real test DB | Login succeeds for the freshly created account. | Failing |
| BE-LOG-17 | Login, call `/auth/me`, then logout, then `/auth/me` | `/auth/me` succeeds before logout and returns 401 after. | Failing |

---

## 3. Password Recovery
### 3.1 Forgot Password API
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-REC-01 | POST `/auth/forgot-password` with a registered email | 200 OK; triggers "Forgot Password" use case and a reset record is created. | Failing |
| BE-REC-02 | Forgot password with an unregistered email | 200 OK with the same response as BE-REC-01; no reset record created. | Failing |
| BE-REC-03 | Forgot password with missing email | 400 Bad Request. | Failing |
| BE-REC-04 | Forgot password with malformed email | 400 Bad Request. | Failing |
| BE-REC-05 | Reset token is stored hashed, not in plaintext | Database holds only a hash of the token. | Failing |
| BE-REC-06 | Requesting a second reset invalidates the first | Earlier token no longer validates. | Failing |

### 3.2 Reset Link Email & Validation API
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-REC-07 | Reset email is sent to the registered address | Exactly one email delivered to that address. | Failing |
| BE-REC-08 | Reset email contains a link with the token | Link points to the frontend reset route and carries the token. | Failing |
| BE-REC-09 | No email sent for an unregistered address | Zero emails delivered. | Failing |
| BE-REC-10 | Validate a fresh, unused token | 200 OK; valid: true. | Failing |
| BE-REC-11 | Validate an expired or already-used token | 400 or 410; error says the link has expired or was used. | Failing |

### 3.3 Reset Password API
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-REC-12 | Reset password with a valid token and new password | 200 OK; password hash is updated. | Failing |
| BE-REC-13 | New password is hashed before storage | Stored value is a hash, not plaintext. | Failing |
| BE-REC-14 | Reset with a password below minimum length | 400 Bad Request; password unchanged. | Failing |
| BE-REC-15 | Token cannot be reused after a successful reset | Second reset with the same token fails. | Failing |
| BE-REC-16 | Old password stops working after reset | Login with the old password returns 401. | Failing |
| BE-REC-17 | New password works after reset | Login with the new password returns 200. | Failing |

---

## 4. Profile Management
### 4.1 Update Profile API
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-PRF-01 | GET `/profile` with a valid token | 200 OK; returns the authenticated user's profile containing `username` and `timezone`. | Failing |
| BE-PRF-02 | PATCH `/profile` with a valid `timezone` | 200 OK; response reflects the new timezone value in `tbl_user`. | Failing |
| BE-PRF-03 | PATCH `/profile` with a new unused `username` | 200 OK; `username` updated in `tbl_user`. | Failing |
| BE-PRF-04 | PATCH `/profile` with a `username` already taken | 409 Conflict; profile unchanged. | Failing |
| BE-PRF-05 | PATCH `/profile` with invalid field values | 400 Bad Request; error identifies each invalid field. | Failing |
| BE-PRF-06 | PATCH `/profile` with no token | 401 Unauthorized. | Failing |
| BE-PRF-07 | PATCH `/profile` cannot modify `uuid` or `created_at` | Those system fields are ignored or rejected; values unchanged. | Failing |
| BE-PRF-08 | User cannot update another user's profile | Only the authenticated user's row changes (Tenant Isolation). | Failing |

### 4.2 Profile Management Backend Integration Tests
| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| BE-PRF-09 | Update profile, then re-fetch from the database | Persisted `username` and `timezone` values match the update. | Failing |
| BE-PRF-10 | Update profile, log out, log in, fetch profile | Updated values are returned after a new session. | Failing |

---

## Summary
| Deliverable | Cases | Failing | Passing | Blocked |
|---|---|---|---|---|
| Registration | 20 | 20 | 0 | 0 |
| Login & Session | 17 | 17 | 0 | 0 |
| Password Recovery | 17 | 17 | 0 | 0 |
| Profile Management | 10 | 10 | 0 | 0 |
| **Total** | **64** | **64** | **0** | **0** |