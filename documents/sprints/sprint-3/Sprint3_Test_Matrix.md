# Sprint 3 Test Matrix

## Overview

This matrix covers Task CRUD, Task Scheduling, and Task Organization at the backend integration, frontend integration, and end-to-end levels. It is the prerequisite for the Sprint 3 Task CRUD work: implementation and test execution should start after this matrix is reviewed. Backend integration tests use the isolated Supabase test project; frontend integration tests exercise the real app components and services while controlling HTTP responses; end-to-end tests exercise the integrated application against isolated test data.

The Tasks, Tasks - Scheduling, and Tasks - Organization API specifications define the API contract. Expected results below describe observable behavior; use the specification for exact route, field, and response names. Tests that depend on task persistence or lifecycle are blocked until Task CRUD is implemented and its backend and frontend integration tests pass. Every end-to-end case is blocked until Task CRUD and the relevant scheduling or organization integration cases pass.

Status values: `Failing` means the case is planned but not yet passing; `Blocked` means a prerequisite must pass first; `Passing` means verified.

## 1. Task CRUD

### 1.1 Backend Integration Tests

Implementation: `backend/tests/integration/tasks.integration.test.ts`. Run with `npm run test:integration` from `backend`, using the isolated Supabase test project. The latest targeted run passed all 9 tests against the isolated project.

| ID         | Test Case                                           | Expected Result                                                                                        | Status  |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------- |
| BE-CRUD-01 | Create a task with valid required fields            | The API returns success and persists a task owned by the authenticated user with the submitted values. | Passing |
| BE-CRUD-02 | Create a task with optional description and project | The task is persisted with the description and project association.                                    | Passing |
| BE-CRUD-03 | Create a task with an empty required title          | The API returns a validation error and creates no task.                                                | Passing |
| BE-CRUD-04 | Create a task with invalid field values             | The API returns a validation error and creates no task.                                                | Passing |
| BE-CRUD-05 | List tasks for an authenticated user                | The response contains that user's tasks and no tasks owned by another user.                            | Passing |
| BE-CRUD-06 | Get an owned task by ID                             | The API returns the task and its persisted fields.                                                     | Passing |
| BE-CRUD-07 | Get another user's task                             | The API returns not found without disclosing the task.                                                 | Passing |
| BE-CRUD-08 | Get a nonexistent or malformed task ID              | The API returns the contract's not-found or validation response; no data is changed.                   | Passing |
| BE-CRUD-09 | Update an owned task's title and description        | The API returns success and persists only the submitted changes.                                       | Passing |
| BE-CRUD-10 | Update a task with invalid values                   | The API returns a validation error and leaves the task unchanged.                                      | Passing |
| BE-CRUD-11 | Update another user's task                          | The API returns not found and leaves the task unchanged.                                               | Passing |
| BE-CRUD-12 | Delete an owned task                                | The API returns the contract's successful deletion response and the task is no longer retrievable.     | Passing |
| BE-CRUD-13 | Delete another user's or a nonexistent task         | The API returns not found; no other task is changed.                                                   | Passing |
| BE-CRUD-14 | Call task endpoints without a valid access token    | Each protected operation returns unauthorized and changes no data.                                     | Passing |

### 1.2 Frontend Integration Tests

| ID         | Test Case                                                    | Expected Result                                                                                                    | Status  |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------- |
| FE-CRUD-01 | Submit the task creation form with valid values              | The task service sends the expected request once; success displays the new task and clears or closes the form.     | Passing |
| FE-CRUD-02 | Submit the task creation form with invalid or missing values | Validation feedback is shown and no request is sent.                                                               | Passing |
| FE-CRUD-03 | Load the task list                                           | The task service requests the current user's tasks and the UI renders the response.                                | Passing |
| FE-CRUD-04 | Open a task for editing and save changes                     | The form is populated from the selected task and the service sends the update; the rendered task reflects success. | Passing |
| FE-CRUD-05 | Cancel task editing or creation                              | The form closes or resets without sending a mutation request.                                                      | Passing |
| FE-CRUD-06 | Delete a task and confirm                                    | The service sends one delete request and the task is removed from the rendered list on success.                    | Passing |
| FE-CRUD-07 | Handle task load or mutation failure                         | The error is shown, existing task data is preserved, and the user can retry where supported.                       | Passing |

### 1.3 End-to-End

| ID          | Test Case                                            | Expected Result                                                                   | Status  |
| ----------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------- |
| E2E-CRUD-01 | Sign in, create a task, and reload the task view     | The created task appears and remains after reload.                                | Passing |
| E2E-CRUD-02 | Create a task with a description and project         | The task appears with the submitted description in the selected project.          | Passing |
| E2E-CRUD-03 | Edit a task and reload the task view                 | Updated values appear and remain after reload.                                    | Passing |
| E2E-CRUD-04 | Submit an invalid task and correct the form          | Validation prevents the invalid save; the corrected task is created successfully. | Passing |
| E2E-CRUD-05 | Delete a task and reload the task view               | The task is absent after deletion and reload.                                     | Passing |
| E2E-CRUD-06 | Sign in as a different user and try to open the task | The other user's task is not shown or accessible.                                 | Passing |

## 2. Task Scheduling

### 2.1 Backend Integration Tests

| ID        | Test Case                                            | Expected Result                                                                                                | Status  |
| --------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------- |
| BE-SCH-01 | Create a task with a scheduled date                  | The scheduled date is persisted and returned with the task.                                                    | Passing |
| BE-SCH-02 | Create a task with a due date                        | The due date is persisted and returned with the task.                                                          | Passing |
| BE-SCH-03 | Update or clear a task's scheduled date and due date | Valid date changes persist; clearing optional dates removes them.                                              | Passing |
| BE-SCH-04 | Submit an invalid date or unsupported schedule value | The API returns a validation error and leaves the task unchanged.                                              | Passing |
| BE-SCH-05 | List tasks for a selected day or date range          | The response includes tasks matching the requested scheduling window and excludes out-of-range tasks.          | Blocked |
| BE-SCH-06 | List upcoming tasks                                  | Tasks are included according to their scheduled or due dates and are ordered as specified by the API contract. | Blocked |
| BE-SCH-07 | List overdue tasks                                   | Incomplete tasks whose due dates have passed are included; completed and not-yet-due tasks are excluded.       | Blocked |
| BE-SCH-08 | Create and retrieve a recurring task                 | The recurrence rule is persisted and returned; generated or subsequent occurrences follow the API contract.    | Passing |
| BE-SCH-09 | Update or remove a recurrence rule                   | The changed or cleared recurrence is persisted without changing unrelated task fields.                         | Passing |

Tests: `tests/regression/tasks/task-scheduling.regression.spec.ts` (and `task-crud.regression.spec.ts` for the response shape), run by `npm run test:regression` through the production app against the reset, seeded local Supabase database.

- BE-SCH-01 to BE-SCH-04: a task created with `scheduledDate` and `dueDate` returns and keeps them; `PUT /api/tasks/{taskId}/schedule`, `/due-date`, `/deadline` and `/recurrence` set and clear each value and return the whole task with the same fields as Task CRUD; invalid dates, an unknown repeat, weekdays on a non-weekly repeat, a weekday of 7 and an end date before the due date return 400 and leave the task exactly as it was.
- BE-SCH-08: completing a weekly task (`PUT /api/tasks/{taskId}` with `isDone: true`) creates exactly one next task, due a week later with the deadline moved by the same amount and the same rule; completing it again creates no second one. No next task is created after the repeat's end date or for a one-off task.
- BE-SCH-09: changing and removing the rule keeps the title and priority.
- BE-SCH-05 to BE-SCH-07 stay Blocked: `GET /api/tasks` has no date-range filter, and upcoming and overdue lists are the Sprint 4 dashboard endpoints (BE-CUR and BE-OVD rows).

### 2.2 Frontend Integration Tests

| ID        | Test Case                                             | Expected Result                                                                                                                                      | Status  |
| --------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-SCH-01 | Set a scheduled date while creating or editing a task | The selected date is included in the task request and displayed after success.                                                                       | Passing |
| FE-SCH-02 | Set, change, or clear a due date                      | The expected date is submitted and the displayed task updates after success.                                                                         | Passing |
| FE-SCH-03 | Submit an invalid date or schedule value              | Inline validation is shown and no invalid request is sent.                                                                                           | Passing |
| FE-SCH-04 | View upcoming and overdue task groups                 | Tasks are displayed in the appropriate group using the returned scheduling data.                                                                     | Blocked |
| FE-SCH-05 | Configure, change, or remove task recurrence          | The recurrence selection is sent to the service and reflected in the task after success.                                                             | Passing |
| FE-SCH-06 | Handle scheduling request failure                     | A visible error is shown and the previously saved schedule remains displayed.                                                                        | Passing |
| FE-SCH-07 | Show and send dates in the session user's timezone    | A deadline shows on its local day for an Asia/Manila or Europe/London user (from `GET /api/auth/me`) and is sent as the end of the chosen day there. | Passing |
| FE-SCH-08 | Complete a recurring task                             | The task advances to the next occurrence returned by the API and stays in the list.                                                                  | Failing |
| FE-SCH-09 | A scheduling request returns 404 or 401               | 404 shows "Task not found." and reloads the list; 401 clears the session and returns to `/login`.                                                    | Passing |
| FE-SCH-10 | Set, change, or clear a deadline                      | The deadline is sent as an ISO instant, or null when cleared, and shown after success.                                                               | Passing |

Tests: `frontend/tests/integration/features/tasks/tasks.integration.spec.ts`; run with `npm run test:run` from `frontend`. They go through the real `/projects/:projectId/tasks` routes behind `authGuard`: the task list, the + New task popup and the edit page with the real task form, due-date, deadline and recurrence pickers and their validators, `TaskService`, `TaskSchedulingService`, `TasksStore` and `authInterceptor`. The user is signed in by restoring a token and answering `GET /api/auth/me`; only the network is faked with `HttpTestingController`, using the bodies of `backend/src/features/tasks` (`toTaskModel`, `validate-request` and `load-owned-task` middleware), and `http.verify()` runs after every test.

- FE-SCH-01 stays Failing: the task form has no scheduled-date control, and the frontend never calls `PUT /api/tasks/{taskId}/schedule`.
- FE-SCH-02, FE-SCH-05, FE-SCH-10: a new task sends `dueDate` (YYYY-MM-DD), `deadline` (end of the chosen day in the user's timezone, as an ISO instant), `recurrence`, `recurrenceDays` and `recurrenceEndDate` in `POST /api/tasks`. An edit sends only what changed, through `PUT /api/tasks/{taskId}/due-date`, `/deadline` and `/recurrence`, one after another. Clearing sends `null`, and removing a repeat sends `recurrence: "none"` with `recurrenceDays: []` and `recurrenceEndDate: null`.
- FE-SCH-03: a deadline before the due date, a repeat with no due date, a weekly repeat with no weekday and an end date before the due date each show their message and send no request.
- FE-SCH-05: list items show the rule, e.g. "Every week on Mon, Wed and Fri" or "Every week on Tue, until Dec 31". The API has no `interval`, so labels such as "Every 2 weeks" cannot appear yet; the Scheduling spec's `interval` field is not implemented.
- FE-SCH-06: a 400 shows on the field it names (e.g. "Invalid deadline" under Deadline) and keeps the edits; if the due date saves and the deadline then fails, the saved due date is kept and the retry sends only the deadline.
- FE-SCH-08 stays Failing: the Scheduling spec (IV.D) completes tasks with `PUT /api/tasks/{taskId}/complete`, which returns the next occurrence. Neither the backend nor the frontend has this route, and the project task list has no complete control. The spec file has an `it.todo` for it.
- These rows were Blocked until Task CRUD passed; the scheduling cases are now verified directly, so their status reflects the tests.

### 2.3 End-to-End

| ID         | Test Case                                        | Expected Result                                                                                   | Status  |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------- |
| E2E-SCH-01 | Create a task scheduled for a future date        | The task appears in the corresponding upcoming view and remains after reload.                     | Blocked |
| E2E-SCH-02 | Set a due date in the past on an incomplete task | The task appears as overdue according to the product's date rules.                                | Blocked |
| E2E-SCH-03 | Change a task's scheduled date and due date      | The task moves to the correct date group and retains the changes after reload.                    | Blocked |
| E2E-SCH-04 | Create a recurring task and revisit its schedule | The recurrence is visible and subsequent occurrences or schedule behavior match the API contract. | Blocked |

## 3. Task Organization

### 3.1 Backend Integration Tests

| ID        | Test Case                                           | Expected Result                                                                              | Status  |
| --------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------- |
| BE-ORG-01 | Create a task with a supported priority             | The priority is persisted and returned with the task.                                        | Passing |
| BE-ORG-02 | Update or clear a task's priority                   | The requested priority change persists without modifying unrelated fields.                   | Failing |
| BE-ORG-03 | Submit an unsupported priority                      | The API returns a validation error and leaves the task unchanged.                            | Passing |
| BE-ORG-04 | Add supported labels to a task                      | The labels are persisted and returned without duplicates.                                    | Passing |
| BE-ORG-05 | Update or remove task labels                        | The label set matches the submitted change; unrelated task data is unchanged.                | Passing |
| BE-ORG-06 | Submit invalid labels or label values               | The API returns a validation error and does not partially apply the update.                  | Passing |
| BE-ORG-07 | List or filter tasks by priority and label          | Only tasks matching the requested organization filters are returned.                         | Passing |
| BE-ORG-08 | Order tasks using the supported organization option | Tasks are returned in the order specified by the API contract, with stable handling of ties. | Failing |
| BE-ORG-09 | Organize tasks belonging to different users         | The operation and filtered results affect only the authenticated user's tasks.               | Passing |

Tests: `tests/regression/tasks/task-organization.regression.spec.ts`, run the same way.

- BE-ORG-01, BE-ORG-03: a task keeps the priority it was created with; `PUT /api/tasks/{taskId}/priority` with an unknown priority returns 400 and the task is unchanged.
- BE-ORG-04 to BE-ORG-06: labels attach (a repeated id once), detach, and are removed from tasks when the label is deleted; an empty list returns 400; a list mixing an own label and another user's returns 404 and attaches nothing. A duplicate label name returns 409 `label-name-taken`; names are unique per user only.
- BE-ORG-07, BE-ORG-09: `priority` and `labelId` filters return only matching tasks; another user cannot read, change, attach, detach or filter by the owner's labels or tasks.
- BE-ORG-02 is Failing until verified in full: the new priority persists, but the specs do not yet check that other fields are untouched, and the API has no way to clear a priority (it is always low, medium or high).
- BE-ORG-08 is Failing until verified in full: `orderBy=title` returns the expected order; tie handling is not checked yet.

### 3.2 Frontend Integration Tests

| ID        | Test Case                                         | Expected Result                                                                                                                                                            | Status  |
| --------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-ORG-01 | Choose a priority when creating or editing a task | The selected priority is sent to the task service and shown after success.                                                                                                 | Passing |
| FE-ORG-02 | Choose, add, or remove task labels                | The selected labels are sent and rendered on the correct task.                                                                                                             | Passing |
| FE-ORG-03 | Filter tasks by priority or label                 | The service receives the selected filter and only matching tasks are rendered.                                                                                             | Passing |
| FE-ORG-04 | Change the task ordering option                   | The service receives the supported ordering selection and the list reflects the response order.                                                                            | Passing |
| FE-ORG-05 | Handle organization update or filter failure      | The UI reports the error and keeps the last successfully saved task state.                                                                                                 | Failing |
| FE-ORG-06 | Manage labels on the label pages                  | The list loads; creating sends `POST /api/labels` with `{name, color}`; a 409 shows a "name already used" field error; edit and delete (after confirming) update the list. | Passing |
| FE-ORG-07 | A priority update returns 400, 404 or 401         | 400 shows the server's message and keeps the chosen priority; 404 shows "Task not found." and reloads the list; 401 clears the session and returns to `/login`.            | Passing |

Tests: the `Priority` block in `frontend/tests/integration/features/tasks/tasks.integration.spec.ts`, set up as described in 2.2.

- FE-ORG-01: the task form's Priority dropdown (High, Medium, Low; new tasks start at Low) sends `priority: "high" | "medium" | "low"` in `POST /api/tasks`, and an edit sends only `{priority}` in `PUT /api/tasks/{taskId}`, before any scheduling route. The list item shows the priority badge. There is no separate priority picker, and the frontend does not use `PUT /api/tasks/{taskId}/priority`.
- FE-ORG-02, FE-ORG-03, FE-ORG-04 and FE-ORG-06 now pass: the task form supports labels, the label-management route supports create/edit/delete, and list filters and ordering are reflected in the URL and retained after reload. FE-ORG-05 remains Failing; filter failure behavior still needs focused verification. FE-ORG-07 covers priority-update failures.
- Fixed while testing: a 400 from `PUT /api/tasks/{taskId}` ("Invalid task update", e.g. for a bad priority) was shown under the Due date field, because the error mapper matched "date" inside "update". It now matches "date" only as a whole word; `task-error.mapper.spec.ts` covers this case.

### 3.3 End-to-End

| ID         | Test Case                              | Expected Result                                                                   | Status  |
| ---------- | -------------------------------------- | --------------------------------------------------------------------------------- | ------- |
| E2E-ORG-01 | Assign a priority to a task and reload | The selected priority is displayed after reload.                                  | Passing |
| E2E-ORG-02 | Add and remove labels on a task        | The task displays the saved label set and reflects removal after reload.          | Passing |
| E2E-ORG-03 | Filter tasks by priority or label      | The result list contains only tasks matching the selected filter.                 | Passing |
| E2E-ORG-04 | Change task ordering and reload        | Tasks appear in the selected order and retain the ordering behavior after reload. | Passing |

## Notes

- Task CRUD backend cases pass, so backend Task Scheduling and Task Organization cases are no longer blocked by it; their statuses come from the API regression specs (see 2.1 and 3.1). Frontend scheduling cases have their own integration tests (see 2.2).
- The Sprint 3 regression runs are recorded in [Sprint3_Regression_Log.md](./Sprint3_Regression_Log.md).
- Task CRUD and organization E2E rows now pass. Scheduling E2E rows remain Blocked where they depend on the Current & Upcoming or Overdue dashboard flows; other open Failing or Blocked rows retain their status until separately verified.
