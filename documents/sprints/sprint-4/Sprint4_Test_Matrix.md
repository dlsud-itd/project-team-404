# Sprint 4 Test Matrix

## Overview

This matrix covers the Current & Upcoming tasks view and the Overdue Tasks view across backend integration, frontend integration, and end-to-end tests. These views depend on the task scheduling contract: tasks are grouped by upcoming scheduled or due dates, while overdue items are incomplete tasks whose due date is in the past. The expected results below describe observable behavior; use the scheduling API specification for exact route, field, and response names.

Tests that depend on task persistence or date grouping are blocked until the Task CRUD and task scheduling integration cases pass. The end-to-end cases run against the real API and a seeded local database, so they do not wait on the integration rows.

Status values: `Failing` means the case is planned but not yet passing; `Blocked` means a prerequisite must pass first; `Passing` means verified.

## 1. Current & Upcoming Tasks View

### 1.1 Backend Integration Tests

| ID        | Test Case                                                  | Expected Result                                                                                                                 | Status  |
| --------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-CUR-01 | List upcoming tasks for an authenticated user              | The response contains only that user's tasks that are scheduled for the current or upcoming window and excludes completed ones. | Blocked |
| BE-CUR-02 | Include tasks with future scheduled dates                  | Tasks scheduled in the future are included in the upcoming grouping according to the API contract.                              | Blocked |
| BE-CUR-03 | Include tasks with future due dates                        | Tasks whose due date is upcoming are included in the current/upcoming view.                                                     | Blocked |
| BE-CUR-04 | Exclude completed tasks from upcoming results              | Completed tasks are not shown in the current or upcoming group even if they have future dates.                                  | Blocked |
| BE-CUR-05 | Exclude tasks outside the selected date window             | Tasks outside the requested schedule window are omitted from the response.                                                      | Blocked |
| BE-CUR-06 | Sort upcoming tasks by scheduled or due date               | Tasks are returned in the specified order, with stable handling of ties.                                                        | Blocked |
| BE-CUR-07 | Filter out other users' tasks                              | Only the authenticated user's tasks are returned.                                                                               | Blocked |
| BE-CUR-08 | Handle invalid date ranges or unsupported schedule filters | The API returns the contract validation error and leaves task data unchanged.                                                   | Blocked |

### 1.2 Frontend Integration Tests

| ID        | Test Case                                               | Expected Result                                                                                                                                                     | Status  |
| --------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-CUR-01 | Load the Current & Upcoming tasks view                  | The task service requests the current user's upcoming tasks and the UI renders the returned items.                                                                  | Passing |
| FE-CUR-02 | Show scheduled and due-date tasks together              | The view includes tasks from either scheduled or due dates, with the correct grouping label and ordering.                                                           | Failing |
| FE-CUR-03 | Exclude completed tasks                                 | Completed tasks do not appear in the Current & Upcoming group.                                                                                                      | Blocked |
| FE-CUR-04 | Render empty state for no upcoming items                | The view shows a no-items message and no broken empty rows or stale data.                                                                                           | Passing |
| FE-CUR-05 | Handle task retrieval failure                           | The UI shows a visible error and preserves the last successful task data.                                                                                           | Failing |
| FE-CUR-06 | Change task scheduling from the task detail or editor   | Any saved schedule update is reflected in the Current & Upcoming view after a successful response.                                                                  | Blocked |
| FE-CUR-07 | Group tasks by day in the session timezone              | Tasks fall into Today, Tomorrow and Later by due date in the user's timezone from `GET /api/auth/me`, including a task near midnight; Later is ordered by due date. | Passing |
| FE-CUR-08 | Show a loading state                                    | "Loading your tasks…" shows until the response arrives, then the groups replace it.                                                                                 | Passing |
| FE-CUR-09 | The request returns 500, or one dashboard section fails | An error with Try again is shown and the retry loads the groups; a failure in Current & Upcoming does not hide Overdue, and the reverse.                            | Passing |
| FE-CUR-10 | Visit `/dashboard` while signed out                     | The user is sent to `/login` and no dashboard request is made.                                                                                                      | Passing |
| FE-CUR-11 | The request returns 401                                 | The session is cleared and the user is redirected to `/login`.                                                                                                      | Passing |

Tests: `frontend/tests/integration/features/dashboard/dashboard.integration.spec.ts`; run with `npm run test:run` from `frontend`. They go through the real `/dashboard` route behind `authGuard` with the dashboard page, the Current & Upcoming section, its task groups and `groupByDay`, the Overdue section, `DashboardService`, `SessionService` and `authInterceptor`. The user is signed in by restoring a token and answering `GET /api/auth/me`. Only the network and the clock (`DASHBOARD_NOW`) are faked; responses are `{ tasks }` built like `toTaskModel` in `backend/src/features/tasks`, and `http.verify()` runs after every test.

- FE-CUR-01: the section sends `GET /api/dashboard/current-upcoming-tasks?days=7` with the token and shows each task's title, priority and, in Later, its date. Tasks link to their edit page unless their project was deleted.
- FE-CUR-07: the clock is set to 16:30 UTC on 6 November 2026, already 00:30 on 7 November in Manila. A task due 7 November is under Today for an Asia/Manila user and under Tomorrow for a Europe/London user. Try again works out "today" again, so a retry after midnight moves the task. Tasks due before today are left out, since they belong to Overdue.
- FE-CUR-02 is Failing: the section and the API group by due date only; `scheduledDate` is not used.
- FE-CUR-03 stays Blocked on the backend: the frontend shows whatever the API returns, and the API leaves out completed tasks (`isDone: false`), which is BE-CUR-04.
- FE-CUR-05 is Failing: the error and retry work (FE-CUR-09), but the section never reloads after a successful load, so there is no earlier data to keep on a failure.
- FE-CUR-11: leaving the page also cancels the Overdue request that was still waiting.

### 1.3 End-to-End

| ID         | Test Case                                                  | Expected Result                                                                                                                                                           | Status  |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-CUR-01 | Log in as a seeded user and open `/dashboard`, then reload | Today, Tomorrow and Later, their counts, the tasks in each and the section total match a service-role query for that user, in the API's order, before and after a reload. | Passing |
| E2E-CUR-02 | Complete one listed task through the API, then reload      | The completed task (matched by id) is no longer listed, and the groups match a fresh service-role query.                                                                  | Passing |
| E2E-CUR-03 | Log in as a freshly created account                        | Today, Tomorrow and Later each show 0 and their empty message, the section shows "0 tasks", and no other user's tasks appear.                                             | Passing |
| E2E-CUR-04 | Visit `/dashboard` while signed out                        | The browser lands on `/login` and no `/api/dashboard` request is made.                                                                                                    | Passing |

Spec: `tests/e2e/dashboard/current-upcoming.e2e.spec.ts`. See "End-to-end dashboard specs" in the Notes for how to run it and what it needs.

## 2. Overdue Tasks View

### 2.1 Backend Integration Tests

| ID        | Test Case                                    | Expected Result                                                                                                               | Status  |
| --------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-OVD-01 | List overdue tasks for an authenticated user | The response includes only incomplete tasks whose due date is before the current time and excludes future or completed tasks. | Blocked |
| BE-OVD-02 | Include overdue tasks with past due dates    | Tasks whose due date is in the past are returned in the overdue grouping.                                                     | Blocked |
| BE-OVD-03 | Exclude completed tasks from overdue results | Completed tasks are absent even if their due date has passed.                                                                 | Blocked |
| BE-OVD-04 | Exclude tasks that are not yet due           | Future-dated tasks are omitted from overdue results.                                                                          | Blocked |
| BE-OVD-05 | Sort overdue tasks by urgency or due date    | The overdue list is returned in the order defined by the API contract.                                                        | Blocked |
| BE-OVD-06 | Filter other users' tasks                    | Only the authenticated user's overdue tasks are returned.                                                                     | Blocked |
| BE-OVD-07 | Handle invalid overdue query parameters      | The API returns validation errors with no task data mutation.                                                                 | Blocked |

### 2.2 Frontend Integration Tests

| ID        | Test Case                                             | Expected Result                                                                                  | Status  |
| --------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------- |
| FE-OVD-01 | Load the Overdue Tasks view                           | The overdue task list is fetched and rendered for the current user.                              | Blocked |
| FE-OVD-02 | Show overdue tasks based on due date                  | Items with past due dates and incomplete status appear in the overdue group.                     | Blocked |
| FE-OVD-03 | Hide tasks that are complete or not yet due           | Completed tasks and future-dated tasks are not rendered.                                         | Blocked |
| FE-OVD-04 | Render empty state for no overdue items               | The view shows a no-overdue-items state instead of empty list placeholders or errors.            | Blocked |
| FE-OVD-05 | Handle overdue task load failure                      | A visible error is shown and the existing list remains intact.                                   | Blocked |
| FE-OVD-06 | Update a task from overdue to complete or rescheduled | The view refreshes correctly and removes or moves the task according to the new due-date result. | Blocked |

### 2.3 End-to-End

| ID         | Test Case                                                    | Expected Result                                                                                                                                                              | Status  |
| ---------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-OVD-01 | Log in as a seeded user and open `/dashboard`, then reload   | The Overdue list matches a service-role query, oldest deadline first, each task shows the right "N days overdue" badge, and the count is correct, before and after a reload. | Passing |
| E2E-OVD-02 | Complete one overdue task through the API, then reload       | The completed task (matched by id) is no longer listed, and the list matches a fresh service-role query.                                                                     | Passing |
| E2E-OVD-03 | Log in as a freshly created account                          | The Overdue list shows "Nothing here" and "0 overdue tasks".                                                                                                                 | Passing |
| E2E-OVD-04 | Log in as Harvey while other seeded users have overdue tasks | None of the other users' overdue tasks appear in the API response or on the page.                                                                                            | Passing |

Spec: `tests/e2e/dashboard/overdue.e2e.spec.ts`.

## Notes

- Current & Upcoming tasks are blocked until the relevant task scheduling backend and frontend cases pass.

### End-to-end dashboard specs

- Run with `npm run test:e2e -- dashboard/` from the repository root (see `documents/setup.md`, "Browser E2E tests"). Both specs run headless in Chromium. They passed twice in a row, plus a third time as part of the full `npm run test:e2e` run, on 14 November 2026 against a database seeded the same day.
- They use Harvey's seeded "Filter fixture" tasks from `supabase/seeds/006_filtering.sql`. Those tasks are due today and in the coming days, with deadlines in the past, all relative to the day the seed ran. Re-seeding does not move the dates, so each spec stops in `beforeAll` with a clear message if the seed is missing or more than one day old: reset with `npm run supabase:local:reset`, then run `npm run supabase:local:seed`.
- Expected results come from service-role queries that apply the API's own rules. Current & Upcoming covers open tasks due from today through 7 days later in the user's timezone. Overdue covers open tasks whose deadline is in the past. Both leave out tasks in archived or deleted projects and are capped at the user's dashboard task limit.
- Completing a recurring task creates its next occurrence with the same title, so tasks are matched by id (taken from the edit link). `afterEach` deletes any task rows added during the test, writes back every changed row from a snapshot taken in `beforeAll`, and fails if Harvey's tasks still differ from that snapshot. It also deletes any freshly created account.
- Overdue is based on the task's deadline, not its due date; E2E-OVD-01 to E2E-OVD-04 follow that.
- Not covered end to end: creating a task with a future scheduled date (scheduled dates are not used for grouping; see FE-CUR-02), editing a task's scheduled date, and changing an overdue task's dates through the editor. The earlier planned rows for these cases were replaced by the rows above.
- FE-OVD-05: an Overdue failure shows its own error and Try again without hiding Current & Upcoming; this is checked in the dashboard spec under FE-CUR-09. The Overdue rows keep their status until the Overdue section has its own integration tests.
- The Current & Upcoming view should follow the scheduling contract for current/future windows and ordering; the Overdue view should show only incomplete tasks whose due dates precede the current time.
- Task results must be scoped to the authenticated user and should not expose another user's tasks by ID, date window, or filtering criteria.
