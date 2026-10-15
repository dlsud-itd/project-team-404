# Sprint 1 Frontend Test Matrix

Last Updated: October 15, 2026 | Version 1.1.0

## Overview

Frontend test cases for Sprint 1 (User Authentication), written before any frontend code exists. Every case starts as Failing and is updated to Passing as each task from the Sprint 1 WBS (v1.1.0) is completed. This version is aligned to the Sprint 1 Backend Test Matrix (v1.0.0, October 14, 2026, which takes priority), the HabitFlow API Specification (v1.1), the Sprint 1 PERT Timeline (v1.1.0) and the Sprint 1 WBS (v1.1.0).

Covers: Registration, Login \& Session, Password Recovery, Profile Management.

Test IDs use the format FE-<DELIVERABLE>-<NN>:

|Code|Deliverable|
|-|-|
|REG|Registration|
|LOG|Login \& Session|
|REC|Password Recovery|
|PRF|Profile Management|

Status values: Failing (default, written before code), Passing, Blocked.

Test groups map to WBS tasks: UI groups map to the UI tasks (2.3.1, 3.3.1 to 3.3.3, 4.3.1 and 4.3.2, 5.3.1), frontend integration groups to 2.3.2, 3.3.4, 4.3.3 and 5.3.2, and end-to-end groups to 2.4.1, 3.4.1, 4.4.1 and 5.4.1. The regression tasks (2.5.1, 3.5.1, 4.5.1, 5.5.1) add no new cases; they re-run every case in this matrix completed so far.

## 1\. Registration (WBS 2.3)

### 1.1 Sign-Up UI (2.3.1)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-REG-01|Sign-up page renders at /register|Username, email, password, confirm password fields, an optional timezone selector (default Asia/Manila) and a submit button are shown|Failing|
|FE-REG-02|Submit with all required fields empty|Required-field errors shown under each field; no API call made|Failing|
|FE-REG-03|Enter a malformed email (e.g. user@)|Inline "invalid email" error shown; submit blocked|Failing|
|FE-REG-04|Enter a username over 50 characters or an email over 255 characters|Inline maximum-length error shown; submit blocked|Failing|
|FE-REG-05|Enter a username containing invalid characters|Inline "username format is invalid" error shown; submit blocked|Failing|
|FE-REG-06|Enter a password below 8 characters|Inline error states the 8-character minimum|Failing|
|FE-REG-07|Password and confirm password do not match|Inline "passwords do not match" error; submit blocked|Failing|
|FE-REG-08|Username availability check on blur (available)|Positive availability indicator shown|Failing|
|FE-REG-09|Username availability check on blur (taken)|"Username already taken" error shown|Failing|
|FE-REG-10|Email availability check on blur (taken)|"Email already registered" error shown|Failing|
|FE-REG-11|Availability check returns 400 (invalid length or format)|API error message shown inline; no availability indicator shown|Failing|
|FE-REG-12|Availability check fails with a network error|No indicator or error blocks the user; availability is still enforced when the form is submitted|Failing|
|FE-REG-13|Submit button is disabled while the request runs|Button disabled and loading state shown; duplicate submits prevented|Failing|
|FE-REG-14|Server returns 409 on submit (username or email already taken)|Conflict error displayed on the relevant field; form values preserved|Failing|
|FE-REG-15|Server returns 400 on submit (e.g. format or minimum length)|Server error message displayed; form values preserved|Failing|
|FE-REG-16|Server returns 500 or network error on submit|Generic error message displayed; user can retry|Failing|
|FE-REG-17|Password fields can toggle visibility|Toggle switches the field between masked and plain text|Failing|
|FE-REG-18|Link to the login page|"Already have an account?" link navigates to /login|Failing|
|FE-REG-19|Form fields are keyboard accessible|Tab order is logical; Enter submits the form; fields have labels|Failing|

### 1.2 Registration Frontend Integration Tests (2.3.2, Sign-Up UI + API)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-REG-20|Valid submit calls POST /auth/register|Request body contains only username, email, password and timezone (if set); confirm password and other extra fields are not sent|Failing|
|FE-REG-21|Password handling after submit|Password is sent only in the request body; it is never placed in the URL or saved in browser storage|Failing|
|FE-REG-22|Registration returns 201 Created|Frontend signs the user in with POST /auth/login using the same credentials and stores the returned token|Failing|
|FE-REG-23|Successful registration lands in the default Inbox|Router navigates to the Inbox project view using the inboxProjectId returned by GET /auth/me|Failing|
|FE-REG-24|Availability checks call GET /auth/check-username/{username} and GET /auth/check-email/{email}|Correct endpoint called; values are URL-encoded (e.g. emails containing @ or +)|Failing|
|FE-REG-25|Availability checks are debounced|One request per settled input, not one per keystroke|Failing|
|FE-REG-26|Email availability is case-insensitive|Entering User@Example.com when user@example.com exists shows "Email already registered"|Failing|
|FE-REG-27|Rejected registration (400 or 409)|No session or token stored; user stays on /register|Failing|

### 1.3 Registration End-to-End (2.4.1)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-REG-28|Sign up through landing in Inbox, in one browser flow|New user fills the form, submits, is signed in and ends on the Inbox view|Failing|
|FE-REG-29|Sign up with a taken username, correct it, and resubmit, in one browser flow|409 error shown first; after changing the username the sign-up succeeds and the user ends on the Inbox view|Failing|

## 2\. Login \& Session (WBS 3.3)

### 2.1 Login UI (3.3.1)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-LOG-01|Login page renders at /login|Identifier (email or username) and password fields, submit button, forgot password link and sign-up link are shown|Failing|
|FE-LOG-02|Submit with empty fields|Required-field errors shown; no API call made|Failing|
|FE-LOG-03|Submit valid email and password|Session stored; router navigates to the Inbox/dashboard|Failing|
|FE-LOG-04|Submit valid username and password|Session stored; router navigates to the Inbox/dashboard|Failing|
|FE-LOG-05|Submit wrong password or unknown account|Same generic "Invalid credentials" message for both (no account enumeration); password field cleared|Failing|
|FE-LOG-06|Submit button disabled while the request runs|Loading state shown; duplicate submits prevented|Failing|
|FE-LOG-07|Link to "Forgot password?"|Navigates to /forgot-password|Failing|
|FE-LOG-08|Link to the sign-up page|Navigates to /register|Failing|
|FE-LOG-09|Network or server error on login|Generic error shown; user can retry|Failing|
|FE-LOG-10|Redirected to /login because the session expired|"Session expired" notice shown above the form|Failing|
|FE-LOG-11|Form fields are keyboard accessible|Tab order is logical; Enter submits the form; fields have labels|Failing|

### 2.2 Session Restore (3.3.2)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-LOG-12|Page refresh with a valid stored session|GET /auth/me succeeds; user remains logged in; no redirect to /login|Failing|
|FE-LOG-13|Page load with an expired stored token|GET /auth/me returns 401; stored session cleared; redirected to /login with a session expired notice|Failing|
|FE-LOG-14|Page load with a malformed or tampered stored token|Stored session cleared; redirected to /login|Failing|
|FE-LOG-15|Unauthenticated visit to a protected route|Redirected to /login|Failing|
|FE-LOG-16|Authenticated visit to /login or /register|Redirected to the Inbox/dashboard|Failing|
|FE-LOG-17|Session restore runs correctly under SSR|No errors from browser-only storage access during server render|Failing|
|FE-LOG-18|Session restore in progress|Loading state shown; neither the login page nor protected content flashes before the result|Failing|

### 2.3 Logout (3.3.3)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-LOG-19|Click logout|Stored session cleared; redirected to /login|Failing|
|FE-LOG-20|Back button after logout|Protected pages are not shown; user stays on /login|Failing|
|FE-LOG-21|Logout request fails or returns 401 (token already invalid)|Local session is still cleared; user redirected to /login|Failing|

### 2.4 Login \& Session Frontend Integration Tests (3.3.4, Login, Session Restore, Logout + API)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-LOG-22|Login calls POST /auth/login|Request body carries the entered identifier and password; token from the response is stored|Failing|
|FE-LOG-23|Login response is handled safely|User details (id, username, email, timezone) held in app state; password is never stored|Failing|
|FE-LOG-24|Authenticated requests carry the session token|Outgoing API calls include Authorization: Bearer <token>|Failing|
|FE-LOG-25|API returns 401 on an authenticated request|Session cleared; user redirected to /login with a session expired notice|Failing|
|FE-LOG-26|Logout calls POST /auth/logout|Request sent with the token; local session cleared after the response|Failing|
|FE-LOG-27|Requests after logout|The old token is never sent again; no protected API calls are made|Failing|
|FE-LOG-28|Session restore populates app state from GET /auth/me|User details and inboxProjectId are available to the app after refresh|Failing|

### 2.5 Login \& Session End-to-End (3.4.1)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-LOG-29|Login, refresh the page, then logout, in one flow|User stays logged in after refresh and is returned to /login after logout|Failing|
|FE-LOG-30|Session expires while the app is open, then user logs in again, in one flow|User is sent to /login with a session expired notice; logging in again succeeds|Failing|

## 3\. Password Recovery (WBS 4.3)

### 3.1 Forgot Password UI (4.3.1)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-REC-01|Forgot password page renders at /forgot-password|Email field and submit button shown|Failing|
|FE-REC-02|Submit with empty email|Required-field error shown; no API call made|Failing|
|FE-REC-03|Submit with malformed email|Inline "invalid email" error shown; no API call made|Failing|
|FE-REC-04|Submit a valid email|Confirmation message tells the user to check their inbox|Failing|
|FE-REC-05|Confirmation is identical for unregistered emails|Same message shown regardless of whether the account exists|Failing|
|FE-REC-06|Submit button disabled while the request runs|Loading state shown; duplicate submits prevented|Failing|
|FE-REC-07|Link back to the login page|Navigates to /login|Failing|
|FE-REC-08|Server returns 400, 500 or a network error|Error message displayed; user can retry|Failing|

### 3.2 Reset Password UI (4.3.2)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-REC-09|Open the reset link with a valid token|Reset form (new password, confirm password) is shown|Failing|
|FE-REC-10|Open the reset link with an invalid or expired token|Error says the link has expired or is invalid, with a link to request a new reset; form not shown|Failing|
|FE-REC-11|Open a reset link whose token was already used or replaced by a newer request|Error says the link was used or has expired, with a link to request a new reset; form not shown|Failing|
|FE-REC-12|Open /reset-password with no token|Error message shown; form not displayed|Failing|
|FE-REC-13|Password below 8 characters|Inline error states the 8-character minimum|Failing|
|FE-REC-14|Password and confirm password do not match|Inline "passwords do not match" error; submit blocked|Failing|
|FE-REC-15|Submit a valid new password|Success message shown; user redirected to /login|Failing|
|FE-REC-16|Server rejects the token on submit|Error message shown; user can request a new link|Failing|
|FE-REC-17|Submit button disabled while the request runs|Loading state shown; duplicate submits prevented|Failing|
|FE-REC-18|Successful reset while a session is stored locally|Local session cleared (existing sessions are invalidated); user must log in again|Failing|

### 3.3 Password Recovery Frontend Integration Tests (4.3.3, Forgot/Reset UI + API)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-REC-19|Forgot form calls POST /auth/forgot-password|Request body contains only the entered email|Failing|
|FE-REC-20|Reset page validates the token on load|GET /auth/validate-reset-token?token=<url token> is called; loading state shown until it returns|Failing|
|FE-REC-21|Reset form calls POST /auth/reset-password|Request body contains the token, newPassword and confirmPassword|Failing|
|FE-REC-22|Token validation responses are mapped to the UI|valid: true shows the form; 400 or 410 with valid: false shows the matching expired, used or invalid message|Failing|

### 3.4 Password Recovery End-to-End (4.4.1)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-REC-23|Request reset, follow link, set password, log in, in one browser flow|Login with the new password succeeds|Failing|
|FE-REC-24|Log in with the old password after a reset|"Invalid credentials" message shown; login fails|Failing|
|FE-REC-25|Open the same reset link again after a successful reset|Error says the link was used or has expired; form not shown|Failing|

## 4\. Profile Management (WBS 5.3)

### 4.1 Profile Settings UI (5.3.1)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-PRF-01|Profile settings page renders at /settings/profile|Username and timezone fields are pre-filled with the current user's details|Failing|
|FE-PRF-02|Unauthenticated visit to the profile page|Redirected to /login|Failing|
|FE-PRF-03|Clear the username and submit|Required-field error shown; no API call made|Failing|
|FE-PRF-04|Enter a username with invalid characters or over 50 characters|Inline format or length error shown; no API call made|Failing|
|FE-PRF-05|Timezone selector|Only valid IANA timezones can be chosen|Failing|
|FE-PRF-06|Change username to one that is taken (409)|"Username already taken" error shown; profile unchanged|Failing|
|FE-PRF-07|Save is disabled until a field changes|Save button enabled only when the form is dirty|Failing|
|FE-PRF-08|Save valid changes|Success message shown; form shows the updated values|Failing|
|FE-PRF-09|Server returns 400 with invalid field values|Each invalid field is marked with its error message|Failing|
|FE-PRF-10|Server error (500) or network error on save|Error message shown; unsaved edits remain in the form|Failing|
|FE-PRF-11|Email and system fields|Email is shown read-only if displayed; id, uuid and created\_at are not editable|Failing|
|FE-PRF-12|Save returns 401|Session cleared; redirected to /login|Failing|

### 4.2 Profile Management Frontend Integration Tests (5.3.2, Profile Settings UI + API)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-PRF-13|Page load calls GET /profile with the token|Form is populated from the API response (username, timezone)|Failing|
|FE-PRF-14|Save calls PATCH /profile|Request body contains only the changed fields|Failing|
|FE-PRF-15|Profile requests never target another user|Request has no user id in the path or body; email, uuid and created\_at are never sent|Failing|
|FE-PRF-16|Change only the timezone|Request body contains only timezone|Failing|
|FE-PRF-17|Updated profile reflected elsewhere in the app|Header/user menu shows the new username without a reload|Failing|

### 4.3 Profile Management End-to-End (5.4.1)

|ID|Test Case|Expected Result|Status|
|-|-|-|-|
|FE-PRF-18|Login, update profile, refresh, confirm persistence|Updated values are still shown after the refresh, in one browser flow|Failing|
|FE-PRF-19|Update profile, logout, log in again, open profile|Updated username and timezone are shown in the new session|Failing|

## Summary

|Deliverable|Cases|Failing|Passing|Blocked|
|-|-|-|-|-|
|Registration|29|29|0|0|
|Login \& Session|30|30|0|0|
|Password Recovery|25|25|0|0|
|Profile Management|19|19|0|0|
|Total|103|103|0|0|



