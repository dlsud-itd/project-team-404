# Sprint 1 Work Breakdown Structure

Last Updated: October 13, 2026 | Version 1.1.0

## Overview

This document breaks Sprint 1 (User Authentication) into tasks using a failing-tests-first approach. The Backend and Frontend Test Matrix PDFs are written first, with every case set to Failing. Each deliverable is then built in the order Supabase migrations, backend, frontend. Integration tests sit inside the layer they cover: backend integration tests close out the Backend group, and frontend integration tests close out the Frontend group. After the frontend, each deliverable ends with its own end-to-end tests, followed by regression tests. When all tests pass, the Status column in both matrices is updated to Passing.

Only Sprint 1 is covered here. Other deliverables and sprints are not repeated.

## Output Location

All Sprint 1 documents are placed in:

```
documents/sprints/sprint-1/
  Sprint1_Work_Breakdown_Structure.pdf
  Sprint1_PERT_Timeline.pdf
  Sprint1_Backend_Test_Matrix.pdf
  Sprint1_Frontend_Test_Matrix.pdf
```

## Test Matrix Format

Each matrix is a table with the fields below. Test IDs use the layer and deliverable, for example BE-REG-01 (backend, Registration) or FE-LOG-03 (frontend, Login & Session).

| ID        | Test Case                         | Expected Result                      | Status  |
| :-------- | :-------------------------------- | :----------------------------------- | :------ |
| BE-REG-01 | Short description of the scenario | Observable outcome that defines pass | Failing |

Status values: Failing (default, written before code), Passing, Blocked.

## Test Types

| Type                   | Placement                                    | Scope                                                                                                                     |
| :--------------------- | :------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| Integration (Backend)  | End of the deliverable's Backend group       | API + Supabase (+ Email where applicable)                                                                                 |
| Integration (Frontend) | End of the deliverable's Frontend group      | UI + API                                                                                                                  |
| End-to-End             | After the Frontend group of each deliverable | The deliverable's full user flow in one browser session                                                                   |
| Regression             | Last group of each deliverable               | Re-runs all previously passing tests (unit, integration, e2e) from this and earlier deliverables to confirm nothing broke |

---

# Sprint 1: User Authentication (parent task)

## 1. Sprint 1 Documents

- **1.1** Sprint 1 WBS
- **1.2** Sprint 1 PERT Timeline
- **1.3** Backend Test Matrix - covers Registration, Login & Session, Password Recovery, Profile Management
- **1.4** Frontend Test Matrix - covers Registration, Login & Session, Password Recovery, Profile Management

## 2. Registration

### 2.1 Supabase Migrations

- **2.1.1** Users Table Migration
- **2.1.2** Projects Table Migration (minimal, for Inbox) - see Notes

### 2.2 Backend

- **2.2.1** Account Creation API (Password Hashing, Input Validation)
- **2.2.2** Username & Email Availability Check
- **2.2.3** Default Inbox Project Creation
- **2.2.4** Registration Backend Integration Tests (API + Supabase)

### 2.3 Frontend

- **2.3.1** Sign-Up UI
- **2.3.2** Registration Frontend Integration Tests (Sign-Up UI + API)

### 2.4 End-to-End Tests

- **2.4.1** Registration End-to-End Tests (sign-up through landing in the default Inbox, in one browser flow)

### 2.5 Regression Tests

- **2.5.1** Registration Regression Tests (re-run all Registration backend, frontend, integration, and e2e suites; establishes the Sprint 1 regression baseline)

## 3. Login & Session

### 3.1 Supabase Migrations

- **3.1.1** No new migration required - uses Users Table from 2.1.1

### 3.2 Backend

- **3.2.1** Login API (Credential Verification, Input Validation)
- **3.2.2** Session Token Handling (Token Utilities)
- **3.2.3** Login & Session Backend Integration Tests (API + Supabase)

### 3.3 Frontend

- **3.3.1** Login UI
- **3.3.2** Session Restore
- **3.3.3** Logout
- **3.3.4** Login & Session Frontend Integration Tests (Login, Session Restore, Logout + API)

### 3.4 End-to-End Tests

- **3.4.1** Login & Session End-to-End Tests (login, page refresh with session restore, logout, in one browser flow)

### 3.5 Regression Tests

- **3.5.1** Login & Session Regression Tests (re-run all Registration and Login & Session suites, including Registration e2e)

## 4. Password Recovery

### 4.1 Supabase Migrations

- **4.1.1** Password Reset Table Migration

### 4.2 Backend

- **4.2.1** Forgot Password API (Input Validation)
- **4.2.2** Reset Link Email
- **4.2.3** Reset Token Validation API
- **4.2.4** Reset Password API (Password Hashing, Input Validation)
- **4.2.5** Password Recovery Backend Integration Tests (API + Supabase + Email)

### 4.3 Frontend

- **4.3.1** Forgot Password UI
- **4.3.2** Reset Password UI
- **4.3.3** Password Recovery Frontend Integration Tests (Forgot/Reset UI + API)

### 4.4 End-to-End Tests

- **4.4.1** Password Recovery End-to-End Tests (request reset, follow reset link, set new password, log in with it, in one browser flow)

### 4.5 Regression Tests

- **4.5.1** Password Recovery Regression Tests (re-run all Registration, Login & Session, and Password Recovery suites)

## 5. Profile Management

### 5.1 Supabase Migrations

- **5.1.1** No new migration required - uses Users Table from 2.1.1

### 5.2 Backend

- **5.2.1** Update Profile API (Input Validation)
- **5.2.2** Profile Management Backend Integration Tests (API + Supabase)

### 5.3 Frontend

- **5.3.1** Profile Settings UI
- **5.3.2** Profile Management Frontend Integration Tests (Profile Settings UI + API)

### 5.4 End-to-End Tests

- **5.4.1** Profile Management End-to-End Tests (log in, update profile, confirm changes persist after refresh, in one browser flow)

### 5.5 Regression Tests

- **5.5.1** Profile Management Regression Tests (final full-suite run of all Sprint 1 backend, frontend, integration, and e2e tests; sign-off gate for the sprint)

## Notes

- Default Inbox Project Creation (2.2.3) needs a projects table. Task 2.1.2 adds a minimal one so Sprint 1 can stand alone; the full Project Data Model remains in Sprint 2. Remove 2.1.2 if the projects table is built earlier.
- Session Restore (3.3.2) and Logout (3.3.3) are frontend tasks that rely on the token handling built in 3.2.2.
- Integration tests now live inside their layer: backend integration tests are the last task of each Backend group, and frontend integration tests are the last task of each Frontend group.
- The former Sprint 1 System Tests group (single end-to-end task 6.1) is removed. End-to-end tests are now split per deliverable (2.4, 3.4, 4.4, 5.4).
- Each regression group re-runs everything completed so far, so it grows with each deliverable. The Profile Management regression run (5.5.1) doubles as the Sprint 1 system-level check.
- The original Authentication Testing group (Backend Auth Test Suite, Frontend Auth Test Suite, Auth Test Matrix) is replaced by the test matrix PDFs (1.3, 1.4), the per-layer integration tests, the per-deliverable end-to-end tests, and the per-deliverable regression tests.
