# Sprint 1 Timeline Development

Last Updated: October 13, 2026 | Version 1.1.0

## PERT Estimation Technique

Each Sprint 1 task from the Sprint 1 Work Breakdown Structure is estimated using the Program Evaluation Review Technique (PERT). Three time estimates are gathered per task: Optimistic (O), Most Likely (M), and Pessimistic (P), each in working days and each set in increments of 0.25. They are combined into a single Expected Time (Te) using the weighted formula:

_**Te = ( O + 4M + P ) / 6**_

This weighs the most likely estimate four times more heavily than the best- and worst-case scenarios, producing a realistic single duration for planning purposes. Te is rounded to the nearest 0.25 day.

## PERT Estimation Table (Sprint 1 Tasks)

Within each deliverable, tasks follow the WBS order: Supabase migrations, Backend (ending with backend integration tests), Frontend (ending with frontend integration tests), End-to-End Tests, Regression Tests.

|  Code   | Work Package                                                                                                                 |  O   |  M   |  P  | Te = (O+4M+P)/6  |
| :-----: | :--------------------------------------------------------------------------------------------------------------------------- | :--: | :--: | :-: | :--------------: |
| **1.0** | **Sprint 1 Documents**                                                                                                       |      |      |     | **Σ 6.00 days**  |
|   1.1   | Sprint 1 WBS (PDF)                                                                                                           | 0.5  |  1   | 1.5 |    1.00 days     |
|   1.2   | Sprint 1 PERT Timeline (PDF)                                                                                                 | 0.5  |  1   | 1.5 |    1.00 days     |
|   1.3   | Backend Test Matrix (PDF)                                                                                                    |  1   |  2   |  3  |    2.00 days     |
|   1.4   | Frontend Test Matrix (PDF)                                                                                                   |  1   |  2   |  3  |    2.00 days     |
| **2.0** | **Registration**                                                                                                             |      |      |     | **Σ 11.50 days** |
|  2.1.1  | Users Table Migration                                                                                                        | 0.5  |  1   | 1.5 |    1.00 days     |
|  2.1.2  | Projects Table Migration (minimal, for Inbox)                                                                                | 0.25 | 0.5  |  1  |    0.50 days     |
|  2.2.1  | Account Creation API (Password Hashing, Input Validation)                                                                    |  1   |  2   |  3  |    2.00 days     |
|  2.2.2  | Username & Email Availability Check                                                                                          | 0.5  |  1   | 1.5 |    1.00 days     |
|  2.2.3  | Default Inbox Project Creation                                                                                               | 0.5  |  1   | 1.5 |    1.00 days     |
|  2.2.4  | Registration Backend Integration Tests (API + Supabase)                                                                      | 0.5  |  1   |  2  |    1.00 days     |
|  2.3.1  | Sign-Up UI                                                                                                                   | 1.5  | 2.5  |  4  |    2.50 days     |
|  2.3.2  | Registration Frontend Integration Tests (Sign-Up UI + API)                                                                   | 0.5  |  1   |  2  |    1.00 days     |
|  2.4.1  | Registration End-to-End Tests (sign-up through landing in the default Inbox, in one browser flow)                            | 0.5  |  1   | 1.5 |    1.00 days     |
|  2.5.1  | Registration Regression Tests (establishes the Sprint 1 regression baseline)                                                 | 0.25 | 0.5  |  1  |    0.50 days     |
| **3.0** | **Login & Session**                                                                                                          |      |      |     | **Σ 10.00 days** |
|  3.2.1  | Login API (Credential Verification, Input Validation)                                                                        |  1   | 1.5  | 2.5 |    1.50 days     |
|  3.2.2  | Session Token Handling (Token Utilities)                                                                                     |  1   | 1.5  | 2.5 |    1.50 days     |
|  3.2.3  | Login & Session Backend Integration Tests (API + Supabase)                                                                   | 0.5  |  1   | 1.5 |    1.00 days     |
|  3.3.1  | Login UI                                                                                                                     |  1   |  2   |  3  |    2.00 days     |
|  3.3.2  | Session Restore                                                                                                              | 0.5  |  1   |  2  |    1.00 days     |
|  3.3.3  | Logout                                                                                                                       | 0.25 | 0.5  |  1  |    0.50 days     |
|  3.3.4  | Login & Session Frontend Integration Tests (Login, Session Restore, Logout + API)                                            | 0.5  |  1   |  2  |    1.00 days     |
|  3.4.1  | Login & Session End-to-End Tests (login, page refresh with session restore, logout, in one browser flow)                     | 0.5  |  1   |  2  |    1.00 days     |
|  3.5.1  | Login & Session Regression Tests (Registration and Login & Session suites)                                                   | 0.25 | 0.5  |  1  |    0.50 days     |
| **4.0** | **Password Recovery**                                                                                                        |      |      |     | **Σ 13.00 days** |
|  4.1.1  | Password Reset Table Migration                                                                                               | 0.5  | 0.75 |  1  |    0.75 days     |
|  4.2.1  | Forgot Password API (Input Validation)                                                                                       | 0.5  |  1   | 1.5 |    1.00 days     |
|  4.2.2  | Reset Link Email                                                                                                             |  1   | 1.5  |  3  |    1.75 days     |
|  4.2.3  | Reset Token Validation API                                                                                                   | 0.5  |  1   | 1.5 |    1.00 days     |
|  4.2.4  | Reset Password API (Password Hashing, Input Validation)                                                                      |  1   | 1.5  | 2.5 |    1.50 days     |
|  4.2.5  | Password Recovery Backend Integration Tests (API + Supabase + Email)                                                         |  1   | 1.5  | 2.5 |    1.50 days     |
|  4.3.1  | Forgot Password UI                                                                                                           | 0.5  |  1   |  2  |    1.00 days     |
|  4.3.2  | Reset Password UI                                                                                                            |  1   | 1.5  | 2.5 |    1.50 days     |
|  4.3.3  | Password Recovery Frontend Integration Tests (Forgot/Reset UI + API)                                                         | 0.5  |  1   |  2  |    1.00 days     |
|  4.4.1  | Password Recovery End-to-End Tests (request reset, follow reset link, set new password, log in with it, in one browser flow) | 0.5  | 1.25 |  2  |    1.25 days     |
|  4.5.1  | Password Recovery Regression Tests (Registration, Login & Session, and Password Recovery suites)                             | 0.25 | 0.75 |  1  |    0.75 days     |
| **5.0** | **Profile Management**                                                                                                       |      |      |     | **Σ 6.00 days**  |
|  5.2.1  | Update Profile API (Input Validation)                                                                                        | 0.5  |  1   |  2  |    1.00 days     |
|  5.2.2  | Profile Management Backend Integration Tests (API + Supabase)                                                                | 0.5  |  1   | 1.5 |    1.00 days     |
|  5.3.1  | Profile Settings UI                                                                                                          |  1   | 1.5  | 2.5 |    1.50 days     |
|  5.3.2  | Profile Management Frontend Integration Tests (Profile Settings UI + API)                                                    | 0.5  |  1   | 1.5 |    1.00 days     |
|  5.4.1  | Profile Management End-to-End Tests (log in, update profile, confirm changes persist after refresh, in one browser flow)     | 0.25 | 0.5  |  1  |    0.50 days     |
|  5.5.1  | Profile Management Regression Tests (final full-suite run of all Sprint 1 tests; sign-off gate for the sprint)               | 0.5  |  1   | 1.5 |    1.00 days     |

**Grand Total (Sprint 1): Σ 46.50 person-days of estimated effort.**

## Notes

- Tasks 3.1.1 (Login & Session) and 5.1.1 (Profile Management) require no new Supabase migration and carry no estimate, since they reuse the Users Table built in 2.1.1.
- Task 2.1.2 (Projects Table Migration) is included so Sprint 1 can stand alone. If the projects table is built earlier, remove it and its estimate.
- Task 1.2 is this document. Tasks 1.3 and 1.4 are written first with every case set to Failing; the integration test tasks (2.2.4, 2.3.2, 3.2.3, 3.3.4, 4.2.5, 4.3.3, 5.2.2, 5.3.2) and the end-to-end tasks (2.4.1, 3.4.1, 4.4.1, 5.4.1) include updating the matrices' Status column to Passing.
- Integration tests now sit inside their layer: backend integration tests are the last task of each Backend group, and frontend integration tests are the last task of each Frontend group.
- The former Sprint 1 System Tests group (6.0, single end-to-end task 6.1, 2.50 days) is removed. End-to-end tests are now split per deliverable (2.4.1, 3.4.1, 4.4.1, 5.4.1).
- Regression tasks (2.5.1, 3.5.1, 4.5.1, 5.5.1) are new. Each re-runs everything completed so far, so the final run (5.5.1) is the Sprint 1 sign-off gate and carries the largest estimate.
- Estimates for the end-to-end and regression tasks are new and should be reviewed by the team. All other estimates are unchanged from v1.0.0 and only renumbered to match WBS v1.2.0.
- Estimates are person-days of effort, summed across tasks. They are not calendar duration, since backend and frontend work can overlap.
