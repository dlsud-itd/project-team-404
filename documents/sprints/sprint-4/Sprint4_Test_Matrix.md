# Sprint 4 Test Matrix

## Overview

This matrix covers the Current & Upcoming tasks view and the Overdue Tasks view across backend integration, frontend integration, and end-to-end tests. These views depend on the task scheduling contract: tasks are grouped by upcoming scheduled or due dates, while overdue items are incomplete tasks whose due date is in the past. The expected results below describe observable behavior; use the scheduling API specification for exact route, field, and response names.

Tests that depend on task persistence or date grouping are blocked until the Task CRUD and task scheduling integration cases pass. Every end-to-end case is blocked until the relevant backend and frontend integration coverage passes.

Status values: `Failing` means the case is planned but not yet passing; `Blocked` means a prerequisite must pass first; `Passing` means verified.

## 1. Current & Upcoming Tasks View

### 1.1 Backend Integration Tests

| ID         | Test Case                                                         | Expected Result                                                                                                               | Status  |
| ---------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-CUR-01 | List upcoming tasks for an authenticated user                    | The response contains only that user's tasks that are scheduled for the current or upcoming window and excludes completed ones. | Blocked |
| BE-CUR-02 | Include tasks with future scheduled dates                         | Tasks scheduled in the future are included in the upcoming grouping according to the API contract.                             | Blocked |
| BE-CUR-03 | Include tasks with future due dates                               | Tasks whose due date is upcoming are included in the current/upcoming view.                                                    | Blocked |
| BE-CUR-04 | Exclude completed tasks from upcoming results                     | Completed tasks are not shown in the current or upcoming group even if they have future dates.                                | Blocked |
| BE-CUR-05 | Exclude tasks outside the selected date window                   | Tasks outside the requested schedule window are omitted from the response.                                                    | Blocked |
| BE-CUR-06 | Sort upcoming tasks by scheduled or due date                     | Tasks are returned in the specified order, with stable handling of ties.                                                     | Blocked |
| BE-CUR-07 | Filter out other users' tasks                                    | Only the authenticated user's tasks are returned.                                                                            | Blocked |
| BE-CUR-08 | Handle invalid date ranges or unsupported schedule filters       | The API returns the contract validation error and leaves task data unchanged.                                               | Blocked |

### 1.2 Frontend Integration Tests

| ID         | Test Case                                                         | Expected Result                                                                                                              | Status  |
| ---------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-CUR-01 | Load the Current & Upcoming tasks view                            | The task service requests the current user's upcoming tasks and the UI renders the returned items.                          | Blocked |
| FE-CUR-02 | Show scheduled and due-date tasks together                       | The view includes tasks from either scheduled or due dates, with the correct grouping label and ordering.                  | Blocked |
| FE-CUR-03 | Exclude completed tasks                                           | Completed tasks do not appear in the Current & Upcoming group.                                                              | Blocked |
| FE-CUR-04 | Render empty state for no upcoming items                          | The view shows a no-items message and no broken empty rows or stale data.                                                  | Blocked |
| FE-CUR-05 | Handle task retrieval failure                                    | The UI shows a visible error and preserves the last successful task data.                                                 | Blocked |
| FE-CUR-06 | Change task scheduling from the task detail or editor            | Any saved schedule update is reflected in the Current & Upcoming view after a successful response.                         | Blocked |

### 1.3 End-to-End

| ID          | Test Case                                                    | Expected Result                                                                                                  | Status  |
| ----------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-CUR-01 | Create a task scheduled for a future date                    | The task appears in the Current & Upcoming view and remains after reload.                                       | Blocked |
| E2E-CUR-02 | Create a task with a future due date                         | The task appears in the correct upcoming grouping using the due date.                                            | Blocked |
| E2E-CUR-03 | Mark a task complete after it was in the upcoming list       | The task disappears from the Current & Upcoming view after the update and reload.                              | Blocked |
| E2E-CUR-04 | Edit a task's scheduled date to a later date                | The task moves to the correct upcoming date grouping and remains after reload.                                 | Blocked |
| E2E-CUR-05 | Open the current/upcoming tasks view after refresh            | The current and upcoming tasks remain visible and correctly ordered with persisted task data.                 | Blocked |
| E2E-CUR-06 | Sign in as a different user and view upcoming tasks          | The other user's upcoming tasks are not shown or accessible.                                                   | Blocked |

## 2. Overdue Tasks View

### 2.1 Backend Integration Tests

| ID         | Test Case                                                         | Expected Result                                                                                                                 | Status  |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-OVD-01 | List overdue tasks for an authenticated user                     | The response includes only incomplete tasks whose due date is before the current time and excludes future or completed tasks. | Blocked |
| BE-OVD-02 | Include overdue tasks with past due dates                        | Tasks whose due date is in the past are returned in the overdue grouping.                                                     | Blocked |
| BE-OVD-03 | Exclude completed tasks from overdue results                    | Completed tasks are absent even if their due date has passed.                                                                  | Blocked |
| BE-OVD-04 | Exclude tasks that are not yet due                              | Future-dated tasks are omitted from overdue results.                                                                           | Blocked |
| BE-OVD-05 | Sort overdue tasks by urgency or due date                       | The overdue list is returned in the order defined by the API contract.                                                       | Blocked |
| BE-OVD-06 | Filter other users' tasks                                      | Only the authenticated user's overdue tasks are returned.                                                                      | Blocked |
| BE-OVD-07 | Handle invalid overdue query parameters                        | The API returns validation errors with no task data mutation.                                                                 | Blocked |

### 2.2 Frontend Integration Tests

| ID         | Test Case                                                         | Expected Result                                                                                                     | Status  |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-OVD-01 | Load the Overdue Tasks view                                      | The overdue task list is fetched and rendered for the current user.                                               | Blocked |
| FE-OVD-02 | Show overdue tasks based on due date                            | Items with past due dates and incomplete status appear in the overdue group.                                    | Blocked |
| FE-OVD-03 | Hide tasks that are complete or not yet due                     | Completed tasks and future-dated tasks are not rendered.                                                         | Blocked |
| FE-OVD-04 | Render empty state for no overdue items                         | The view shows a no-overdue-items state instead of empty list placeholders or errors.                             | Blocked |
| FE-OVD-05 | Handle overdue task load failure                               | A visible error is shown and the existing list remains intact.                                                   | Blocked |
| FE-OVD-06 | Update a task from overdue to complete or rescheduled            | The view refreshes correctly and removes or moves the task according to the new due-date result.                 | Blocked |

### 2.3 End-to-End

| ID          | Test Case                                                   | Expected Result                                                                                           | Status  |
| ----------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------- |
| E2E-OVD-01 | Create an incomplete task with a past due date              | The task appears in the Overdue Tasks view and remains after reload.                                     | Blocked |
| E2E-OVD-02 | Mark an overdue task complete                              | The task is removed from the Overdue Tasks view after save and reload.                                   | Blocked |
| E2E-OVD-03 | Change an overdue task's due date to a future date          | The task moves out of the overdue group and into the Current & Upcoming view as expected.               | Blocked |
| E2E-OVD-04 | Open the overdue tasks view after refresh                  | The overdue list remains correct and ordered after a browser refresh.                                     | Blocked |
| E2E-OVD-05 | Sign in as a different user and open overdue tasks         | The other user's overdue task is not shown or accessible.                                               | Blocked |

## Notes

- Current & Upcoming tasks and every end-to-end case are blocked until the relevant task scheduling backend and frontend cases pass.
- The Current & Upcoming view should follow the scheduling contract for current/future windows and ordering; the Overdue view should show only incomplete tasks whose due dates precede the current time.
- Task results must be scoped to the authenticated user and should not expose another user's tasks by ID, date window, or filtering criteria.
