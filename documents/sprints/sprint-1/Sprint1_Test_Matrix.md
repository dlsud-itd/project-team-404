# Sprint 1 Test Matrix

Last Updated: October 21, 2026

## Overview

Combined backend and frontend test cases for Sprint 1 (User Authentication): Registration, Login & Session, Password Recovery, and Profile Management. Test IDs retain their original prefixes: `BE` for backend and `FE` for frontend.

Frontend integration tests use the app's real routes, `AuthService`, and `HttpClient`; only network requests are faked with `HttpTestingController`. Run with `npm test` from `frontend`.

Backend integration tests are in `backend/src/testing/integration`. Run with `npm run test:integration` from `backend`, setting `SUPABASE_TEST_URL`, `SUPABASE_TEST_SERVICE_ROLE_KEY`, and `SUPABASE_TEST_DATABASE_URL` to an isolated Supabase test project; `SUPABASE_TEST_DIRECT_URL` can optionally specify its direct database connection. The suite skips if neither Supabase URL nor service-role key is set, refuses if only one is set, and refuses if the test URL matches `SUPABASE_URL`.

Status values: `Failing`, `Passing`, `Blocked`.
aa

## 1. Registration

### 1.1 Account Creation API

| ID        | Test Case                                       | Expected Result                                                         | Status  |
| --------- | ----------------------------------------------- | ----------------------------------------------------------------------- | ------- |
| BE-REG-01 | POST `/auth/register` with valid payload        | 201 Created; creates user in `auth.users` and a `tbl_user` profile.     | Failing |
| BE-REG-02 | Password is hashed before storage               | Stored password value is a hash, never equal to the plaintext password. | Failing |
| BE-REG-03 | Register with missing username                  | 400 Bad Request; error identifies `username` as required.               | Failing |
| BE-REG-04 | Register with missing email                     | 400 Bad Request; error identifies email as required.                    | Failing |
| BE-REG-05 | Register with malformed email (`user@`)         | 400 Bad Request; registration error is returned.                        | Failing |
| BE-REG-06 | Register with password shorter than minimum     | 400 Bad Request; error states the minimum password length.              | Failing |
| BE-REG-07 | Register with username containing invalid chars | 400 Bad Request; error says `username` format is invalid.               | Failing |
| BE-REG-08 | Register with unexpected extra fields in body   | Extra fields are ignored or rejected; no extra data is persisted.       | Failing |

### 1.2 Username & Email Availability Check

| ID        | Test Case                                         | Expected Result                                           | Status  |
| --------- | ------------------------------------------------- | --------------------------------------------------------- | ------- |
| BE-REG-09 | Check availability of an unused username          | 200 OK; `available: true`.                                | Failing |
| BE-REG-10 | Check availability of an existing username        | 200 OK; `available: false`.                               | Failing |
| BE-REG-11 | Check availability of an existing email           | 200 OK; `available: false`.                               | Failing |
| BE-REG-12 | Check email availability with different casing    | Email comparison is case-insensitive.                     | Failing |
| BE-REG-13 | Register with a username that is already taken    | 409 Conflict; no new user row is created in `tbl_user`.   | Passing |
| BE-REG-14 | Register with an email that is already registered | 409 Conflict; no new user row is created in `auth.users`. | Passing |

### 1.3 Default Inbox Project Creation

| ID        | Test Case                                     | Expected Result                                                            | Status  |
| --------- | --------------------------------------------- | -------------------------------------------------------------------------- | ------- |
| BE-REG-15 | Successful registration creates default Inbox | Exactly one project named "Inbox" is created automatically at signup.      | Failing |
| BE-REG-16 | Inbox is flagged as the default project       | Created Inbox project has `is_inbox` set to true in `tbl_project`.         | Failing |
| BE-REG-17 | Failed registration creates no Inbox          | No orphan project rows exist after a rejected registration.                | Failing |
| BE-REG-18 | Inbox creation failure rolls back the user    | `tbl_user` and `auth.users` rows are rolled back if Inbox insertion fails. | Failing |

### 1.4 Registration Backend Integration Tests

| ID        | Test Case                                      | Expected Result                                              | Status  |
| --------- | ---------------------------------------------- | ------------------------------------------------------------ | ------- |
| BE-REG-19 | Register against a real Supabase test database | User row and Inbox project row both exist after the request. | Blocked |
| BE-REG-20 | Two simultaneous registrations with same email | One returns 201, the other 409; only one user row exists.    | Blocked |

### 1.5 Sign-Up UI

| ID        | Test Case                                           | Expected Result                                                                                                      | Status  |
| --------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-REG-01 | Open the sign-up page at `/register`                | Username, email, password, confirm password, optional timezone (default `Asia/Manila`), and submit button are shown. | Failing |
| FE-REG-02 | Submit with all required fields empty               | Required-field errors are shown under each field; no API call is made.                                               | Failing |
| FE-REG-03 | Enter a malformed email (e.g. `user@`)              | Inline invalid-email error is shown; submit is blocked.                                                              | Failing |
| FE-REG-04 | Enter username over 50 or email over 255 characters | Inline maximum-length error is shown; submit is blocked.                                                             | Failing |
| FE-REG-05 | Enter a username containing invalid characters      | Inline username-format error is shown; submit is blocked.                                                            | Failing |
| FE-REG-06 | Enter a password below 8 characters                 | Inline error states the 8-character minimum.                                                                         | Failing |
| FE-REG-07 | Enter passwords that do not match                   | Inline passwords-do-not-match error is shown; submit is blocked.                                                     | Failing |
| FE-REG-08 | Check available username on blur                    | Positive availability indicator is shown.                                                                            | Failing |
| FE-REG-09 | Check taken username on blur                        | "Username already taken" error is shown.                                                                             | Failing |
| FE-REG-10 | Check an already registered email                   | "Email already registered" error is shown.                                                                           | Failing |
| FE-REG-11 | Availability check returns 400                      | API error message is shown inline; no availability indicator is shown.                                               | Failing |
| FE-REG-12 | Availability check fails with a network error       | No blocking indicator or error is shown; availability is enforced on submit.                                         | Failing |
| FE-REG-13 | Submit the registration form                        | Button is disabled and loading state shown while request runs; duplicate submits are prevented.                      | Failing |
| FE-REG-14 | Submit returns 409 for taken username or email      | Conflict error is shown on the relevant field; form values are preserved.                                            | Failing |
| FE-REG-15 | Submit returns 400 for invalid input                | Server error message is shown; form values are preserved.                                                            | Failing |
| FE-REG-16 | Submit returns 500 or a network error               | Generic error is shown; user can retry.                                                                              | Failing |
| FE-REG-17 | Toggle password visibility                          | Password field switches between masked and plain text.                                                               | Failing |
| FE-REG-18 | Follow the existing-account link                    | Link navigates to `/login`.                                                                                          | Failing |
| FE-REG-19 | Navigate and submit the form with a keyboard        | Fields have labels and logical tab order; Enter submits the form.                                                    | Failing |

### 1.6 Registration Frontend Integration Tests

| ID        | Test Case                                        | Expected Result                                                                                                           | Status  |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-REG-20 | Submit valid sign-up details                     | Per API Specification v1.1, sends username, email, password, and optional timezone, without confirmation or extra fields. | Blocked |
| FE-REG-21 | Submit a password                                | Password is sent only in the request body; it is never in the URL or browser storage.                                     | Passing |
| FE-REG-22 | Handle a 201 registration response               | Frontend signs in with `/auth/login` using the same credentials and stores the returned token.                            | Blocked |
| FE-REG-23 | Complete registration and open the default Inbox | Router navigates to Inbox using the `inboxProjectId` returned by `/auth/me`.                                              | Blocked |
| FE-REG-24 | Check username and email availability            | Correct endpoints are called; values are URL-encoded (including `@` and `+`).                                             | Passing |
| FE-REG-25 | Type into an availability field                  | Checks are debounced; one request is made per settled input.                                                              | Passing |
| FE-REG-26 | Check email availability with different casing   | `User@Example.com` is reported as registered if `user@example.com` exists.                                                | Passing |
| FE-REG-27 | Submit registration rejected with 400 or 409     | No session or token is stored; user stays on `/register`.                                                                 | Passing |

Tests: `frontend/src/testing/integration/registration.integration.spec.ts`.

- FE-REG-20 is Blocked by a contract conflict. API Specification v1.1 lists username, email, password and timezone for signup, but the backend `signupSchema` also requires `confirmPassword` and returns 400 without it. The frontend sends `confirmPassword` so that registration works against the real API, and the test checks the five fields the backend accepts with no extras. The team needs to decide whether the backend drops `confirmPassword` or the spec adds it.
- FE-REG-22 and FE-REG-23 are Blocked by Login \& Session (WBS 3.x). POST /auth/login and GET /auth/me do not exist yet, so after a 201 the page shows an "Account created" confirmation with a link to /login instead of signing the user in.

### 1.7 Registration End-to-End

| ID        | Test Case                                                                    | Expected Result                                                                     | Status  |
| --------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------- |
| FE-REG-28 | Sign up through landing in Inbox, in one browser flow                        | New user fills the form, submits, is signed in, and ends on the Inbox view.         | Failing |
| FE-REG-29 | Sign up with a taken username, correct it, and resubmit, in one browser flow | 409 error appears first; corrected username allows sign-up and navigation to Inbox. | Failing |

## 2. Login & Session

### 2.1 Login API

| ID        | Test Case                                        | Expected Result                                                            | Status  |
| --------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ------- |
| BE-LOG-01 | POST `/auth/login` with valid email and password | 200 OK; credentials are accepted and a session token is returned.          | Failing |
| BE-LOG-02 | Log in with valid username and password          | 200 OK; session token is returned.                                         | Failing |
| BE-LOG-03 | Log in with wrong password                       | 401 Unauthorized; generic invalid-credentials message.                     | Failing |
| BE-LOG-04 | Log in with unknown email                        | 401 Unauthorized; same message as wrong password (no account enumeration). | Failing |
| BE-LOG-05 | Log in with missing password                     | 400 Bad Request; error identifies password as required.                    | Failing |
| BE-LOG-06 | Log in with missing identifier                   | 400 Bad Request; error identifies the missing field.                       | Failing |
| BE-LOG-07 | Inspect login response                           | Response body contains no password or hash field.                          | Failing |

### 2.2 Session Token Handling

| ID        | Test Case                                        | Expected Result                                               | Status  |
| --------- | ------------------------------------------------ | ------------------------------------------------------------- | ------- |
| BE-LOG-08 | Issue a token for a user                         | Token is non-empty and decodes to the correct `user_id` UUID. | Failing |
| BE-LOG-09 | Request a protected route with a valid token     | 200 OK; request is attributed to the correct user.            | Failing |
| BE-LOG-10 | Request a protected route with no token          | 401 Unauthorized.                                             | Failing |
| BE-LOG-11 | Request a protected route with a malformed token | 401 Unauthorized.                                             | Failing |
| BE-LOG-12 | Request a protected route with an expired token  | 401 Unauthorized; error indicates the session expired.        | Failing |
| BE-LOG-13 | Request a protected route with a tampered token  | 401 Unauthorized.                                             | Failing |
| BE-LOG-14 | Call `/auth/me` with a valid token               | 200 OK; current user profile is returned.                     | Failing |
| BE-LOG-15 | Call `/auth/logout` with a valid token           | 200 or 204; token is no longer accepted afterwards.           | Failing |

### 2.3 Login & Session Backend Integration Tests

| ID        | Test Case                                              | Expected Result                                          | Status  |
| --------- | ------------------------------------------------------ | -------------------------------------------------------- | ------- |
| BE-LOG-16 | Create a test account then log in against Supabase     | Login succeeds for the integration account.              | Blocked |
| BE-LOG-17 | Log in, call `/auth/me`, log out, then call `/auth/me` | `/auth/me` succeeds before logout and returns 401 after. | Blocked |

Integration coverage is in `backend/src/testing/integration/login.integration.test.ts`. The tests use the real auth router and database, but were skipped because the isolated Supabase test-project configuration is not available; the cases remain Blocked until run against that project.

### 2.4 Login UI

| ID        | Test Case                                       | Expected Result                                                                        | Status  |
| --------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- | ------- |
| FE-LOG-01 | Open the login page at `/login`                 | Identifier, password, submit button, forgot-password link, and sign-up link are shown. | Failing |
| FE-LOG-02 | Submit with empty fields                        | Required-field errors are shown; no API call is made.                                  | Passing |
| FE-LOG-03 | Submit valid email and password                 | Session is stored; router navigates to Inbox/dashboard.                                | Passing |
| FE-LOG-04 | Submit valid username and password              | Session is stored; router navigates to Inbox/dashboard.                                | Failing |
| FE-LOG-05 | Submit wrong password or unknown account        | Same generic invalid-credentials message appears; password field is cleared.           | Passing |
| FE-LOG-06 | Submit the login form                           | Button is disabled and loading state shown; duplicate submits are prevented.           | Failing |
| FE-LOG-07 | Follow the "Forgot password?" link              | Navigates to `/forgot-password`.                                                       | Failing |
| FE-LOG-08 | Follow the sign-up link                         | Navigates to `/register`.                                                              | Failing |
| FE-LOG-09 | Login request returns a network or server error | Generic error is shown; user can retry.                                                | Failing |
| FE-LOG-10 | Navigate and submit the form with a keyboard    | Fields have labels and logical tab order; Enter submits the form.                      | Failing |

### 2.5 Session Restore and Logout UI

| ID        | Test Case                                         | Expected Result                                                           | Status  |
| --------- | ------------------------------------------------- | ------------------------------------------------------------------------- | ------- |
| FE-LOG-11 | Refresh page with a valid stored session          | `/auth/me` succeeds; user remains logged in without redirect to `/login`. | Passing |
| FE-LOG-12 | Load page with malformed or tampered stored token | Stored session is cleared; user is redirected to `/login`.                | Passing |
| FE-LOG-13 | Visit a protected route while unauthenticated     | User is redirected to `/login`.                                           | Passing |
| FE-LOG-14 | Visit `/login` or `/register` while authenticated | User is redirected to Inbox/dashboard.                                    | Passing |
| FE-LOG-15 | Restore session under SSR                         | No browser-only storage access errors occur during server render.         | Failing |
| FE-LOG-16 | Restore session while request is in progress      | Loading state prevents login page or protected content from flashing.     | Failing |
| FE-LOG-17 | Click logout                                      | Stored session is cleared; user is redirected to `/login`.                | Passing |
| FE-LOG-18 | Use browser back after logout                     | Protected pages are not shown; user stays on `/login`.                    | Failing |
| FE-LOG-19 | Logout request fails or returns 401               | Local session is still cleared; user is redirected to `/login`.           | Passing |

### 2.6 Login & Session Frontend Integration Tests

| ID        | Test Case                                         | Expected Result                                                                         | Status  |
| --------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- | ------- |
| FE-LOG-20 | Submit login credentials                          | Calls `/auth/login`; request carries identifier and password; returned token is stored. | Passing |
| FE-LOG-21 | Handle a successful login response                | User details are held in app state; password is never stored.                           | Passing |
| FE-LOG-22 | Make an authenticated API request                 | Request includes the session token in the Authorization header.                         | Passing |
| FE-LOG-23 | API returns 401 for an invalid or revoked session | Session is cleared; user is redirected to `/login` with a sign-in-required notice.      | Failing |
| FE-LOG-24 | Log out                                           | Calls `/auth/logout` with token; local session is cleared after response.               | Passing |
| FE-LOG-25 | Make requests after logout                        | Old token is never sent again; no protected API calls are made.                         | Passing |
| FE-LOG-26 | Restore session from `/auth/me`                   | User details and `inboxProjectId` are available after refresh.                          | Passing |

Tests: `frontend/src/testing/integration/login.integration.spec.ts`. They run through the real routes (`/login` and `/register` behind `guestGuard`, `/home` behind `authGuard`), `SessionService`, `TokenStorageService`, `authInterceptor` and the restore-session initializer, with response bodies from `backend/src/features/auth`.

- `/home` is a placeholder signed-in page with the logout button. It stands in for the Inbox/dashboard in FE-LOG-03 and FE-LOG-14 until the Inbox page exists (Sprint 2).
- FE-LOG-23 remains Failing. A 401 from any API call clears the session and redirects to `/login` (tested), but the login page does not yet show a sign-in-required notice.

### 2.7 Login & Session End-to-End

| ID        | Test Case                                          | Expected Result                                                              | Status  |
| --------- | -------------------------------------------------- | ---------------------------------------------------------------------------- | ------- |
| FE-LOG-27 | Log in, refresh the page, then log out in one flow | User stays logged in after refresh and is returned to `/login` after logout. | Failing |

## 3. Password Recovery

### 3.1 Forgot Password API

| ID        | Test Case                                            | Expected Result                                                            | Status  |
| --------- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ------- |
| BE-REC-01 | POST `/auth/forgot-password` with a registered email | 200 OK; reset record is created.                                           | Blocked |
| BE-REC-02 | Request reset for an unregistered email              | 200 OK with same response as registered email; no reset record is created. | Blocked |
| BE-REC-03 | Request reset with missing email                     | 400 Bad Request.                                                           | Failing |
| BE-REC-04 | Request reset with malformed email                   | 400 Bad Request.                                                           | Blocked |
| BE-REC-05 | Inspect stored reset token                           | Database holds only a hash of the token.                                   | Blocked |
| BE-REC-06 | Request a second password reset                      | Earlier token no longer validates.                                         | Blocked |

### 3.2 Reset Link Email & Validation API

| ID        | Test Case                                 | Expected Result                                            | Status  |
| --------- | ----------------------------------------- | ---------------------------------------------------------- | ------- |
| BE-REC-07 | Send reset email to registered address    | Exactly one email is delivered to that address.            | Blocked |
| BE-REC-08 | Inspect reset email link                  | Link points to frontend reset route and carries the token. | Blocked |
| BE-REC-09 | Request reset for an unregistered address | No email is delivered.                                     | Blocked |
| BE-REC-10 | Validate a fresh, unused token            | 200 OK; `valid: true`.                                     | Blocked |
| BE-REC-11 | Validate an expired or already-used token | 400 or 410; error says the link expired or was used.       | Blocked |

### 3.3 Reset Password API

| ID        | Test Case                                        | Expected Result                         | Status  |
| --------- | ------------------------------------------------ | --------------------------------------- | ------- |
| BE-REC-12 | Reset password with valid token and new password | 200 OK; password hash is updated.       | Blocked |
| BE-REC-13 | Inspect stored password after reset              | Stored value is a hash, not plaintext.  | Failing |
| BE-REC-14 | Reset with password below minimum length         | 400 Bad Request; password is unchanged. | Blocked |
| BE-REC-15 | Reuse token after a successful reset             | Second reset with same token fails.     | Blocked |
| BE-REC-16 | Log in with old password after reset             | Login returns 401.                      | Blocked |
| BE-REC-17 | Log in with new password after reset             | Login returns 200.                      | Blocked |

Password-recovery integration coverage is in `backend/src/testing/integration/password-recovery.integration.test.ts`. It uses the real auth router and database with an in-memory mailer; the Supabase-dependent cases are Blocked until run against the isolated test project. BE-REC-03 (missing email) and BE-REC-13 (explicit password-hash inspection) are not covered by that integration suite and remain Failing.

### 3.4 Forgot and Reset Password UI

| ID        | Test Case                                                   | Expected Result                                                               | Status  |
| --------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- | ------- |
| FE-REC-01 | Open forgot-password page at `/forgot-password`             | Email field and submit button are shown.                                      | Failing |
| FE-REC-02 | Submit forgot-password form with empty email                | Required-field error is shown; no API call is made.                           | Passing |
| FE-REC-03 | Submit forgot-password form with malformed email            | Inline invalid-email error is shown; no API call is made.                     | Passing |
| FE-REC-04 | Submit a valid email                                        | Confirmation tells user to check their inbox.                                 | Passing |
| FE-REC-05 | Submit an unregistered email                                | Same confirmation is shown as for a registered email.                         | Passing |
| FE-REC-06 | Submit forgot-password request                              | Button is disabled and loading state shown; duplicate submits are prevented.  | Failing |
| FE-REC-07 | Follow login link from forgot-password page                 | Navigates to `/login`.                                                        | Failing |
| FE-REC-08 | Forgot-password request returns 400, 500, or network error  | Error message is displayed; user can retry.                                   | Passing |
| FE-REC-09 | Open reset link with a valid token                          | Reset form with new password and confirmation is shown.                       | Passing |
| FE-REC-10 | Open reset link with an invalid or expired token            | Error and link to request a new reset are shown; form is hidden.              | Passing |
| FE-REC-11 | Open reset link whose token was used or replaced            | Used/expired error and link to request a new reset are shown; form is hidden. | Passing |
| FE-REC-12 | Open `/reset-password` without a token                      | Error is shown; reset form is not displayed.                                  | Passing |
| FE-REC-13 | Enter password below 8 characters                           | Inline error states the 8-character minimum.                                  | Passing |
| FE-REC-14 | Enter mismatched new password and confirmation              | Inline passwords-do-not-match error is shown; submit is blocked.              | Passing |
| FE-REC-15 | Submit a valid new password                                 | Success message is shown; user is redirected to `/login`.                     | Passing |
| FE-REC-16 | Server rejects reset token on submit                        | Error message is shown; user can request a new link.                          | Passing |
| FE-REC-17 | Submit reset-password form                                  | Button is disabled and loading state shown; duplicate submits are prevented.  | Failing |
| FE-REC-18 | Successfully reset password while session is stored locally | Local session is cleared; user must log in again.                             | Passing |

### 3.5 Password Recovery Frontend Integration Tests

| ID        | Test Case                        | Expected Result                                                                                         | Status  |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| FE-REC-19 | Submit forgot-password form      | Calls `/auth/forgot-password` with only the entered email.                                              | Passing |
| FE-REC-20 | Load reset page with URL token   | Calls token validation endpoint; loading state is shown until response.                                 | Passing |
| FE-REC-21 | Submit reset-password form       | Calls `/auth/reset-password` with token, newPassword, and confirmPassword.                              | Passing |
| FE-REC-22 | Handle token validation response | `valid: true` shows form; 400/410 with `valid: false` shows matching expired, used, or invalid message. | Passing |

Tests: `frontend/src/testing/integration/password-recovery.integration.spec.ts`. They run through the real `/forgot-password` and `/reset-password` routes, `AuthService`, `SessionService` and `authInterceptor`, with response bodies from `backend/src/features/auth`.

- FE-REC-22: the backend rejects a token with `400 {"error": "Reset token is invalid", "reason": "expired" | "used" | "invalid"}`, not `valid: false`. The page shows the message for that `reason` (from `token-status-message.util.ts`).
- FE-REC-16: `POST /auth/reset-password` returns `400 {"error": "This reset link is invalid or has expired."}` with no reason, so the page shows the expired message and the "Request a new link" link.
- FE-REC-15: after a successful reset the user is sent to `/login?reset=success`, where the login page shows the password-updated message.
- FE-REC-01, FE-REC-06, FE-REC-07 and FE-REC-17 are not covered by tests yet. FE-REC-07 also fails as written: the forgot-password page links to `/register`, not `/login`.

### 3.6 Password Recovery End-to-End

| ID        | Test Case                                                        | Expected Result                                    | Status  |
| --------- | ---------------------------------------------------------------- | -------------------------------------------------- | ------- |
| FE-REC-23 | Request reset, follow link, set password, and log in in one flow | Login with the new password succeeds.              | Failing |
| FE-REC-24 | Log in with old password after a reset                           | Invalid-credentials message is shown; login fails. | Failing |
| FE-REC-25 | Open the same reset link again after a successful reset          | Used/expired error is shown; reset form is hidden. | Failing |

## 4. Profile Management

### 4.1 Update Profile API

| ID        | Test Case                                      | Expected Result                                                 | Status  |
| --------- | ---------------------------------------------- | --------------------------------------------------------------- | ------- |
| BE-PRF-01 | GET `/profile` with a valid token              | 200 OK; returns authenticated user's username and timezone.     | Failing |
| BE-PRF-02 | PATCH `/profile` with a valid timezone         | 200 OK; response reflects updated timezone in `tbl_user`.       | Failing |
| BE-PRF-03 | PATCH `/profile` with a new unused username    | 200 OK; username is updated in `tbl_user`.                      | Failing |
| BE-PRF-04 | PATCH `/profile` with a username already taken | 409 Conflict; profile is unchanged.                             | Failing |
| BE-PRF-05 | PATCH `/profile` with invalid field values     | 400 Bad Request; error identifies each invalid field.           | Failing |
| BE-PRF-06 | PATCH `/profile` with no token                 | 401 Unauthorized.                                               | Failing |
| BE-PRF-07 | Attempt to modify `uuid` or `created_at`       | System fields are ignored or rejected; values remain unchanged. | Failing |
| BE-PRF-08 | Attempt to update another user's profile       | Only authenticated user's row changes (tenant isolation).       | Failing |

### 4.2 Profile Management Backend Integration Tests

| ID        | Test Case                                        | Expected Result                                   | Status  |
| --------- | ------------------------------------------------ | ------------------------------------------------- | ------- |
| BE-PRF-09 | Update profile, then re-fetch from database      | Persisted username and timezone match the update. | Failing |
| BE-PRF-10 | Update profile, log out, log in, and fetch again | Updated values are returned after a new session.  | Failing |

### 4.3 Profile Settings UI

| ID        | Test Case                                    | Expected Result                                                           | Status  |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------- | ------- |
| FE-PRF-01 | Open profile settings at `/settings/profile` | Username and timezone fields are pre-filled with current user's details.  | Failing |
| FE-PRF-02 | Visit profile settings while unauthenticated | User is redirected to `/login`.                                           | Failing |
| FE-PRF-03 | Clear username and submit                    | Required-field error is shown; no API call is made.                       | Failing |
| FE-PRF-04 | Enter invalid or over-50-character username  | Inline format or length error is shown; no API call is made.              | Failing |
| FE-PRF-05 | Open timezone selector                       | Only valid IANA timezones can be chosen.                                  | Failing |
| FE-PRF-06 | Change username to one that is taken         | 409 response shows "Username already taken"; profile remains unchanged.   | Failing |
| FE-PRF-07 | Open profile form without changing fields    | Save is enabled only when the form is dirty.                              | Failing |
| FE-PRF-08 | Save valid profile changes                   | Success message is shown; form displays updated values.                   | Failing |
| FE-PRF-09 | Server returns 400 for invalid field values  | Each invalid field is marked with its error message.                      | Failing |
| FE-PRF-10 | Save returns 500 or network error            | Error is shown; unsaved edits remain in the form.                         | Failing |
| FE-PRF-11 | View email and system fields                 | Email is read-only if shown; id, uuid, and `created_at` are not editable. | Failing |
| FE-PRF-12 | Profile save returns 401                     | Session is cleared; user is redirected to `/login`.                       | Failing |

### 4.4 Profile Management Frontend Integration Tests

| ID        | Test Case             | Expected Result                                                                | Status  |
| --------- | --------------------- | ------------------------------------------------------------------------------ | ------- |
| FE-PRF-13 | Load profile settings | Calls `GET /profile` with token; form is populated with username and timezone. | Failing |
| FE-PRF-14 | Save profile changes  | Calls `PATCH /profile` with only changed fields.                               | Failing |
| FE-PRF-15 | Submit profile update | Request omits user id; email, uuid, and `created_at` are never sent.           | Failing |
| FE-PRF-16 | Change only timezone  | Request body contains only timezone.                                           | Failing |
| FE-PRF-17 | Update username       | Header/user menu shows new username without a reload.                          | Failing |

### 4.5 Profile Management End-to-End

| ID        | Test Case                                           | Expected Result                                                   | Status  |
| --------- | --------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| FE-PRF-18 | Log in, update profile, refresh, and confirm values | Updated values are still shown after refresh in one browser flow. | Failing |
| FE-PRF-19 | Update profile, log out, log in, and open profile   | Updated username and timezone are shown in the new session.       | Failing |

## Summary

| Deliverable        | Backend Cases | Frontend Cases | Total   | Failing | Passing | Blocked |
| ------------------ | ------------- | -------------- | ------- | ------- | ------- | ------- |
| Registration       | 20            | 29             | 49      | 37      | 7       | 5       |
| Login & Session    | 17            | 27             | 44      | 27      | 15      | 2       |
| Password Recovery  | 17            | 25             | 42      | 9       | 18      | 15      |
| Profile Management | 10            | 19             | 29      | 29      | 0       | 0       |
| **Total**          | **64**        | **100**        | **164** | **102** | **40**  | **22**  |
