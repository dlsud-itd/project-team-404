# Sprint 3 Test Matrix

## Overview

This matrix covers Task CRUD, Task Scheduling, and Task Organization at the backend integration, frontend integration, and end-to-end levels. It is the prerequisite for the Sprint 3 Task CRUD work: implementation and test execution should start after this matrix is reviewed. Backend integration tests use the isolated Supabase test project; frontend integration tests exercise the real app components and services while controlling HTTP responses; end-to-end tests exercise the integrated application against isolated test data.

The Tasks, Tasks - Scheduling, and Tasks - Organization API specifications define the API contract. Expected results below describe observable behavior; use the specification for exact route, field, and response names. Tests that depend on task persistence or lifecycle are blocked until Task CRUD is implemented and its backend and frontend integration tests pass. Every end-to-end case is blocked until Task CRUD and the relevant scheduling or organization integration cases pass.

Status values: `Failing` means the case is planned but not yet passing; `Blocked` means a prerequisite must pass first; `Passing` means verified.

## 1. Task CRUD

### 1.1 Backend Integration Tests

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| BE-CRUD-01 | Create a task with valid required fields | The API returns success and persists a task owned by the authenticated user with the submitted values. | Failing |
| BE-CRUD-02 | Create a task with optional description and project | The task is persisted with the description and project association. | Failing |
| BE-CRUD-03 | Create a task without required fields | The API returns a validation error and creates no task. | Failing |
| BE-CRUD-04 | Create a task with invalid field values | The API returns a validation error and creates no task. | Failing |
| BE-CRUD-05 | List tasks for an authenticated user | The response contains that user's tasks and no tasks owned by another user. | Failing |
| BE-CRUD-06 | Get an owned task by ID | The API returns the task and its persisted fields. | Failing |
| BE-CRUD-07 | Get another user's task | The API returns not found without disclosing the task. | Failing |
| BE-CRUD-08 | Get a nonexistent or malformed task ID | The API returns the contract's not-found or validation response; no data is changed. | Failing |
| BE-CRUD-09 | Update an owned task's title and description | The API returns success and persists only the submitted changes. | Failing |
| BE-CRUD-10 | Update a task with invalid values | The API returns a validation error and leaves the task unchanged. | Failing |
| BE-CRUD-11 | Update another user's task | The API returns not found and leaves the task unchanged. | Failing |
| BE-CRUD-12 | Delete an owned task | The API returns the contract's successful deletion response and the task is no longer retrievable. | Failing |
| BE-CRUD-13 | Delete another user's or a nonexistent task | The API returns not found; no other task is changed. | Failing |
| BE-CRUD-14 | Call task endpoints without a valid access token | Each protected operation returns unauthorized and changes no data. | Failing |

### 1.2 Frontend Integration Tests

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| FE-CRUD-01 | Submit the task creation form with valid values | The task service sends the expected request once; success displays the new task and clears or closes the form. | Failing |
| FE-CRUD-02 | Submit the task creation form with invalid or missing values | Validation feedback is shown and no request is sent. | Failing |
| FE-CRUD-03 | Load the task list | The task service requests the current user's tasks and the UI renders the response. | Failing |
| FE-CRUD-04 | Open a task for editing and save changes | The form is populated from the selected task and the service sends the update; the rendered task reflects success. | Failing |
| FE-CRUD-05 | Cancel task editing or creation | The form closes or resets without sending a mutation request. | Failing |
| FE-CRUD-06 | Delete a task and confirm | The service sends one delete request and the task is removed from the rendered list on success. | Failing |
| FE-CRUD-07 | Handle task load or mutation failure | The error is shown, existing task data is preserved, and the user can retry where supported. | Failing |

### 1.3 End-to-End

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| E2E-CRUD-01 | Sign in, create a task, and reload the task view | The created task appears and remains after reload. | Blocked |
| E2E-CRUD-02 | Create a task with a description and project | The task appears with the submitted description in the selected project. | Blocked |
| E2E-CRUD-03 | Edit a task and reload the task view | Updated values appear and remain after reload. | Blocked |
| E2E-CRUD-04 | Submit an invalid task and correct the form | Validation prevents the invalid save; the corrected task is created successfully. | Blocked |
| E2E-CRUD-05 | Delete a task and reload the task view | The task is absent after deletion and reload. | Blocked |
| E2E-CRUD-06 | Sign in as a different user and try to open the task | The other user's task is not shown or accessible. | Blocked |

## 2. Task Scheduling

### 2.1 Backend Integration Tests

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| BE-SCH-01 | Create a task with a scheduled date | The scheduled date is persisted and returned with the task. | Blocked |
| BE-SCH-02 | Create a task with a due date | The due date is persisted and returned with the task. | Blocked |
| BE-SCH-03 | Update or clear a task's scheduled date and due date | Valid date changes persist; clearing optional dates removes them. | Blocked |
| BE-SCH-04 | Submit an invalid date or unsupported schedule value | The API returns a validation error and leaves the task unchanged. | Blocked |
| BE-SCH-05 | List tasks for a selected day or date range | The response includes tasks matching the requested scheduling window and excludes out-of-range tasks. | Blocked |
| BE-SCH-06 | List upcoming tasks | Tasks are included according to their scheduled or due dates and are ordered as specified by the API contract. | Blocked |
| BE-SCH-07 | List overdue tasks | Incomplete tasks whose due dates have passed are included; completed and not-yet-due tasks are excluded. | Blocked |
| BE-SCH-08 | Create and retrieve a recurring task | The recurrence rule is persisted and returned; generated or subsequent occurrences follow the API contract. | Blocked |
| BE-SCH-09 | Update or remove a recurrence rule | The changed or cleared recurrence is persisted without changing unrelated task fields. | Blocked |

### 2.2 Frontend Integration Tests

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| FE-SCH-01 | Set a scheduled date while creating or editing a task | The selected date is included in the task request and displayed after success. | Blocked |
| FE-SCH-02 | Set, change, or clear a due date | The expected date is submitted and the displayed task updates after success. | Blocked |
| FE-SCH-03 | Submit an invalid date or schedule value | Inline validation is shown and no invalid request is sent. | Blocked |
| FE-SCH-04 | View upcoming and overdue task groups | Tasks are displayed in the appropriate group using the returned scheduling data. | Blocked |
| FE-SCH-05 | Configure, change, or remove task recurrence | The recurrence selection is sent to the service and reflected in the task after success. | Blocked |
| FE-SCH-06 | Handle scheduling request failure | A visible error is shown and the previously saved schedule remains displayed. | Blocked |

### 2.3 End-to-End

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| E2E-SCH-01 | Create a task scheduled for a future date | The task appears in the corresponding upcoming view and remains after reload. | Blocked |
| E2E-SCH-02 | Set a due date in the past on an incomplete task | The task appears as overdue according to the product's date rules. | Blocked |
| E2E-SCH-03 | Change a task's scheduled date and due date | The task moves to the correct date group and retains the changes after reload. | Blocked |
| E2E-SCH-04 | Create a recurring task and revisit its schedule | The recurrence is visible and subsequent occurrences or schedule behavior match the API contract. | Blocked |

## 3. Task Organization

### 3.1 Backend Integration Tests

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| BE-ORG-01 | Create a task with a supported priority | The priority is persisted and returned with the task. | Blocked |
| BE-ORG-02 | Update or clear a task's priority | The requested priority change persists without modifying unrelated fields. | Blocked |
| BE-ORG-03 | Submit an unsupported priority | The API returns a validation error and leaves the task unchanged. | Blocked |
| BE-ORG-04 | Add supported labels to a task | The labels are persisted and returned without duplicates. | Blocked |
| BE-ORG-05 | Update or remove task labels | The label set matches the submitted change; unrelated task data is unchanged. | Blocked |
| BE-ORG-06 | Submit invalid labels or label values | The API returns a validation error and does not partially apply the update. | Blocked |
| BE-ORG-07 | List or filter tasks by priority and label | Only tasks matching the requested organization filters are returned. | Blocked |
| BE-ORG-08 | Order tasks using the supported organization option | Tasks are returned in the order specified by the API contract, with stable handling of ties. | Blocked |
| BE-ORG-09 | Organize tasks belonging to different users | The operation and filtered results affect only the authenticated user's tasks. | Blocked |

### 3.2 Frontend Integration Tests

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| FE-ORG-01 | Choose a priority when creating or editing a task | The selected priority is sent to the task service and shown after success. | Blocked |
| FE-ORG-02 | Choose, add, or remove task labels | The selected labels are sent and rendered on the correct task. | Blocked |
| FE-ORG-03 | Filter tasks by priority or label | The service receives the selected filter and only matching tasks are rendered. | Blocked |
| FE-ORG-04 | Change the task ordering option | The service receives the supported ordering selection and the list reflects the response order. | Blocked |
| FE-ORG-05 | Handle organization update or filter failure | The UI reports the error and keeps the last successfully saved task state. | Blocked |

### 3.3 End-to-End

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| E2E-ORG-01 | Assign a priority to a task and reload | The selected priority is displayed after reload. | Blocked |
| E2E-ORG-02 | Add and remove labels on a task | The task displays the saved label set and reflects removal after reload. | Blocked |
| E2E-ORG-03 | Filter tasks by priority or label | The result list contains only tasks matching the selected filter. | Blocked |
| E2E-ORG-04 | Change task ordering and reload | Tasks appear in the selected order and retain the ordering behavior after reload. | Blocked |

## Notes

- Task Scheduling and Task Organization integration cases are Blocked until Task CRUD backend and frontend integration cases pass.
- Every end-to-end case is Blocked until Task CRUD and the relevant integration cases pass.