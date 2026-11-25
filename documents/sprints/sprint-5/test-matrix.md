# Sprint 5 Test Matrix

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Overview

This matrix covers Sorting & Filtering, Archive, Labels & Priorities Management, Settings (Configuration & Preferences), and Search across backend integration, frontend integration, and end-to-end tests. The Sprint 5 [API Specification](<./Team-404 - API Specification - Filtering, Archive, Labels & Priorities, Settings & Search.md>) defines the routes, fields, validation, and response contracts. Expected results below describe observable behavior; use the specification for exact request and response shapes.

Sorting & Filtering backend implementation is gated on Tech Lead approval of the draft API specification. Its backend and frontend integration rows are therefore blocked. Every end-to-end row is blocked until the relevant backend and frontend integration cases pass; this includes all Sorting & Filtering E2E rows.

Backend integration tests should use the isolated Supabase test project and verify persisted state, ownership, and non-mutation on errors. Frontend integration tests should exercise the real routes, components, and services while controlling HTTP responses. End-to-end tests should exercise the integrated application with isolated test data and verify state after reload.

Run backend integration tests with `npm run test:integration` from `backend`, frontend tests with `npm run test:run` from `frontend`, and E2E tests with `npm run test:e2e` from the repository root.

Status values: `Failing` means the case is planned but not yet passing; `Blocked` means a prerequisite must pass first; `Passing` means verified.

## Latest Regression Run: November 20, 2026

The database was reset and seeded locally before the run; all 14 seed SQL files
and `verify_seeds.sql` passed. `npm run test:regression` completed without E2E.
The run had **0 skipped tests**, but did not pass overall:

| Suite                       | Passed | Failed | Skipped | Result        |
| --------------------------- | -----: | -----: | ------: | ------------- |
| Backend unit                |    329 |      0 |       0 | Pass          |
| Backend integration         |    146 |     16 |       0 | Fail          |
| Backend API regression      |     13 |      5 |       0 | Fail          |
| Frontend unit + integration |   1166 |      0 |       0 | Pass (1 todo) |
| Frontend regression         |     17 |      0 |       0 | Pass          |

Sprint 5 regression spec results:

| Spec                                   | Result | Finding                                                                  |
| -------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `sort-filter.regression.spec.ts`       | Pass   | Legacy priority/label filters and default ordering passed.               |
| `archive.regression.spec.ts`           | Pass   | Project archive/restore compatibility and task data preservation passed. |
| `labels-priorities.regression.spec.ts` | Pass   | Priority-by-name and label CRUD compatibility passed.                    |
| `settings.regression.spec.ts`          | Fail   | Dashboard response is missing the expected `total`.                      |
| `search.regression.spec.ts`            | Pass   | Search isolation/exclusions and unchanged dashboard results passed.      |

The full backend suites also exposed failures in dashboard limit overrides,
label/priority reordering, settings auth expectations, task update response
compatibility, project filtering/sorting, and the Sprint 6 streak scenarios.
See [`Sprint5_Regression_Log.md`](./Sprint5_Regression_Log.md) for the exact run
summary and unresolved blockers. Existing matrix rows remain unchanged unless
their entire case was verified; this partial regression run does not justify
marking the broader cases Passing.

## 1. Sorting & Filtering

### 1.1 Backend Integration Tests

| ID       | Test Case                                              | Expected Result                                                                                                                                             | Status  |
| -------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-SF-01 | List tasks with defaults and legacy filters            | Omitted filters return active tasks by default; `status`, `isDone`, `priority`, and `labelId` retain their documented compatibility and conflict rules.     | Blocked |
| BE-SF-02 | Combine task filters                                   | Project, status, priority, label, date bounds, due-date presence, overdue, and recurrence filters combine with AND; multiple priorities use OR.             | Blocked |
| BE-SF-03 | Match tasks against multiple labels                    | `labelMatch=any` returns tasks with at least one requested label; `all` requires every label; results are unique.                                           | Blocked |
| BE-SF-04 | Filter tasks by dates and user-local overdue status    | Inclusive `dueFrom`/`dueTo` bounds are honored, and `overdue=true` uses the caller's timezone and excludes completed tasks.                                 | Blocked |
| BE-SF-05 | Sort tasks by every supported field and direction      | Each supported `orderBy` and `orderDirection` is honored; null dates sort last, priority uses `sortOrder`, and task ID breaks ties stably.                  | Blocked |
| BE-SF-06 | Reject invalid or conflicting task query parameters    | Unsupported values, malformed IDs/dates, duplicate or conflicting parameters, invalid ranges, and limit violations return 400 without changing data.        | Blocked |
| BE-SF-07 | Scope task filtering and sorting to the caller         | Another user's tasks, labels, priorities, and projects cannot be read or inferred through filters; unauthenticated requests return 401.                     | Blocked |
| BE-SF-08 | Filter and sort projects                               | Favorite, archive, color, and ordering filters return only matching caller-owned projects with the documented stable ID tie-breaker.                        | Blocked |
| BE-SF-09 | Limit project results and preserve the legacy response | A valid limit returns `{ projects, total }` with the total before limiting; an omitted limit preserves the existing Sprint 2 project response and behavior. | Blocked |
| BE-SF-10 | Reject invalid project filters, ordering, and limits   | Invalid booleans, colors, sort fields/directions, and limits return 400; missing or invalid authentication returns 401.                                     | Blocked |

These backend cases remain blocked until Tech Lead approval of the Sorting & Filtering API contract.

### 1.2 Frontend Integration Tests

| ID       | Test Case                                               | Expected Result                                                                                                                    | Status  |
| -------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-SF-01 | Filter tasks by project, status, and priority           | Controls send the selected supported query parameters and render only the returned matching tasks.                                 | Passing |
| FE-SF-02 | Filter tasks by labels and date criteria                | Label any/all, due-date bounds, has-due-date, overdue, and recurring controls send the expected query and display the response.    | Passing |
| FE-SF-03 | Sort tasks and projects                                 | Selecting a supported sort field and direction requests that order and renders the response order, including null values and ties. | Passing |
| FE-SF-04 | Filter projects and use the result limit                | Favorite, archive, and color filters are sent correctly; a limited response renders its projects and matching total.               | Blocked |
| FE-SF-05 | Validate unsupported filters and handle failed requests | Invalid choices are prevented or reported; a server error is visible and the last successful results remain available for retry.   | Passing |
| FE-SF-06 | Preserve existing project-list behavior without a limit | Existing project views continue to render the legacy response when no `limit` is requested.                                        | Passing |

Tests: `frontend/tests/integration/features/tasks/sort-filter.integration.spec.ts`; run with `npm run test:run` from `frontend` (18 tests; the whole frontend suite passed on 20 November 2026). They go through the real `/projects/:projectId/tasks` and `/projects` routes behind `authGuard`, with the real task filter bar, sort menu, `TaskQueryStore` (with its real 250 ms debounce), `TaskService`, `TasksStore`, `LabelService`, the project filter bar, `ProjectService`, `ProjectsStore` and `authInterceptor`. `providePriorityLevels()` and `provideUserSettings()` are registered as in `app.config.ts`. Only the network is faked, with the backend's bodies and status codes (`toTaskModel`, `toProjectModel`, `toLabelModel`, `toPriorityModel`, the validate-request `400` body for `GET /tasks`, the `401` from require-auth and the error handler's `500`), and `http.verify()` runs after every test. The debounce runs on Vitest's fake `setInterval` and `Date`, the two timers `debounceTime` uses.

- FE-SF-01: choosing High and Low and the Planning label sends one `GET /tasks` with `priorities=high,low&labelId=21`. The URL becomes `?priorities=high,low&labelIds=21`, and the list shows only the returned tasks. Quick changes to several chips send a single request, and only after 250 ms without input. Clear all removes every filter from the URL and the request and fetches again; it keeps the sort, since sorting is not a filter. When nothing matches, the page shows "No tasks match these filters." with Clear filters, which brings every task back.
- FE-SF-02: Any/All label matching sends `labelIds` and `labelMatch=all`. Overdue sends `overdue=true`, No date sends `hasDueDate=false`, Repeating and One-time send `recurring`, and a custom range sends inclusive `dueFrom` and `dueTo`. Reloading a filtered URL restores every chip and the sort menu, and sends the same request as before the reload.
- FE-SF-03: each of the seven task sort fields, in both directions, sends `orderBy` and `orderDirection`. Picking another field keeps the current direction. Default order sends neither and gives a plain URL. Tasks appear in the order the server returns them, including null dates last and ties. Projects sort by name and by created date in the browser: missing dates go last in either direction, and ties keep the custom order.
- FE-SF-05: a custom range whose start is after its end shows "â€œFromâ€ must be on or before â€œToâ€." and is not sent. A `400` such as `Invalid task filters` for an unknown priority level shows "Priority filter couldn't be applied, so it was removed." It removes only the refused filter, from the URL as well, and loads the list again without it. A `500` keeps the filter and the last results and shows Try again, which sends the same request. A `401` clears the session and opens `/login`.
- FE-SF-06: with no filter or sort, `/projects` opens `/home?tab=projects` with the Inbox, Favorites and My projects groups. It loads them from the two existing requests, `GET /projects?isArchived=false` and `?isArchived=true`, and sends no `limit`.
- FE-SF-04 stays Blocked. The Favorites, Archived and Color chips and the project sort are written to the URL (`favorites`, `archived`, `color`, `sort`, `dir`), restored on reload, and applied to the lists already loaded. None of them is sent to the server, and the page has no result limit. Both wait for the BE-SF-08/09 project contract.
- Found while matching the bodies: the task list sends the user's own priority levels by name (`priorities=urgent`), but `GET /tasks` only accepts `low`, `medium` and `high` there and answers `400`. Before this change, that `400` showed "Couldn't load your tasks. Invalid task filters" with a Try again that could only fail again. The task list now removes the refused filter instead.

### 1.3 End-to-End

| ID        | Test Case                                         | Expected Result                                                                                               | Status  |
| --------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-SF-01 | Combine task filters and reload the results       | Only tasks matching the selected criteria appear, and the same result set is shown after reload.              | Passing |
| E2E-SF-02 | Sort tasks and projects                           | Results follow the selected order, including stable ties and null-date placement, after reload.               | Passing |
| E2E-SF-03 | Filter tasks by due-date range and overdue status | Inclusive date bounds and the user's timezone determine the displayed tasks correctly.                        | Blocked |
| E2E-SF-04 | Filter projects and limit the list                | Matching projects and the total count are displayed; existing project pages continue to work without a limit. | Blocked |

Tests: `tests/e2e/organization/sort-filter.e2e.spec.ts` (2 tests); run with `npm run test:e2e -- organization/ settings/` from the repository root (headless Chromium; passed twice in a row with `--repeat-each=2` and again as a separate run on 20 November 2026, on a locally seeded database). They sign in as `harvey` and use `alex` as the other user, check what the page shows against service-role queries, and put every changed row back after each test, failing if Harvey's seeded rows differ afterwards.

- E2E-SF-01: in Harvey's `Filtering - Client Work` project, choosing High, Low and the Review label sends one debounced `GET /tasks` with both filters, writes them to the URL, and shows exactly the tasks a service-role query finds for that project, priority and label. After a reload the chips, the sort menu and the request are the same. Clear all brings back every task in the project.
- E2E-SF-02: sorting by Deadline, descending, shows the tasks in the order the service-role rows give (null deadlines last, then task id), open tasks before completed ones, before and after a reload. On `/projects`, Favorites sorted by Name shows the favorite projects in name order, and both are restored after a reload.
- E2E-SF-03 and E2E-SF-04 stay Blocked: there is no E2E for due-date ranges or overdue yet, and the project list has no result limit in the frontend (see FE-SF-04).

## 2. Archive

### 2.1 Backend Integration Tests

| ID        | Test Case                                                 | Expected Result                                                                                                            | Status  |
| --------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-ARC-01 | Archive and restore a task                                | Archive and restore persist `isArchived` and `archivedAt`; repeating either request is idempotent.                         | Failing |
| BE-ARC-02 | Enforce archived task restrictions                        | Archived tasks cannot be edited, completed, scheduled, reprioritized, or relabeled; DELETE remains allowed.                | Failing |
| BE-ARC-03 | Archive and restore projects                              | Owned projects archive and restore idempotently; archiving Inbox returns the documented 409 conflict.                      | Failing |
| BE-ARC-04 | Archive and restore labels                                | Owned labels archive and restore idempotently; existing task links remain, but archived labels cannot be newly assigned.   | Failing |
| BE-ARC-05 | List archived items by type and page                      | `/archive` returns every group, filters by type, sorts newest archived first, and reports total and next cursor correctly. | Failing |
| BE-ARC-06 | Exclude deleted and foreign resources from archive        | Soft-deleted rows are omitted; callers cannot see another user's archived items.                                           | Failing |
| BE-ARC-07 | Exclude archives from ordinary lists and dashboards       | Default task, project, label, dashboard, and search results exclude archived resources; explicit archive filters work.     | Failing |
| BE-ARC-08 | Reject invalid archive input and handle missing resources | Invalid IDs/bodies/cursors return 400, unauthenticated calls return 401, and missing or foreign resources return 404.      | Failing |

### 2.2 Frontend Integration Tests

| ID        | Test Case                                                  | Expected Result                                                                                                                 | Status  |
| --------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-ARC-01 | Archive and restore a task                                 | The UI sends the correct archive state, removes the task from active results, and restores it to active results on success.     | Passing |
| FE-ARC-02 | Archive and restore a project or label                     | Successful actions update active and archived views without losing the resource's associated tasks or labels.                   | Passing |
| FE-ARC-03 | Browse archive groups, filters, and pages                  | Type filters show the selected group; totals and next-page behavior match the API response.                                     | Passing |
| FE-ARC-04 | Prevent or report actions forbidden for archived resources | Archived tasks are read-only except for delete/restore; archived labels cannot be newly selected for a task.                    | Passing |
| FE-ARC-05 | Handle archive failures                                    | A visible error is shown for failed archive, restore, or list requests, and the last successful state is preserved.             | Passing |
| FE-ARC-06 | Honor active-only defaults                                 | Ordinary task, project, label, dashboard, and search views do not show archived items unless the user explicitly includes them. | Failing |

Tests: `frontend/tests/integration/features/archive/archive.integration.spec.ts`; run with `npm run test:run` from `frontend` (15 tests; the whole frontend suite passed on 22 November 2026). They go through the real app shell behind `authGuard`: the project task list, the task edit page, the project switcher, Settings > Labels and `/archive`. They use the real `ArchiveService`, `ArchiveUndoService`, `TaskService`, `LabelService`, `ProjectService`, the task and project stores, `ToastService` and `authInterceptor`. `ToastOutlet` lives in the root component, outside the routed pages, so the spec renders it next to the router harness. Only the network is faked, with the backend's bodies (`toTaskModel`, `toProjectModel` and `toLabelModel` with `isArchived`/`archivedAt`, the `GET /archive` groups with totals and `nextCursor`, the `409` from `task-organization.controller.ts`, require-auth's `401` and the error handler's `500`), and `http.verify()` runs after every test.

- FE-ARC-01: Archive on a task in the list removes it at once and sends `PUT /tasks/:id/archive` with `{ isArchived: true }`. The toast "Task â€œâ€¦â€ archived" offers Undo, which puts the task back and sends `{ isArchived: false }`. Restoring a task on `/archive` removes its row and lowers the counts, and the task is back in its project's list.
- FE-ARC-02: restoring a project on `/archive` sends `PUT /projects/:id/archive` and the project is back among active projects in the switcher. In Settings > Labels, Archive moves a label to the Archived list and Undo moves it back. Archiving a project from the switcher is covered in `projects.integration.spec.ts`.
- FE-ARC-03: `/archive` sends `type=all&limit=20` and shows tasks, projects and labels, newest first, with counts on every tab. Each tab sends its own `type` and keeps the other counts. Load more sends the `cursor` and appends the next page, and the button goes away when `nextCursor` is null. Delete permanently first asks "Delete â€¦ permanently?" with what it removes; Cancel sends nothing, and confirming sends `DELETE` and removes the row. An empty archive shows "Nothing archived yet", and each tab has its own empty text.
- FE-ARC-04: an archived task opens read-only: a banner with Restore, disabled fields and label boxes, Save disabled, no Archive action and Close instead of Cancel. Restore makes it editable again. An archived label is not offered in the label picker (for a new task or on the edit page), but a task that has it still shows it greyed in the list and checked, disabled and marked "(archived)" on its form. The Inbox has no Archive action in the project switcher.
- FE-ARC-05: a failed archive puts the task back and shows "Couldn't archive task â€œâ€¦â€. Please try again."; a failed restore on `/archive` puts the row and count back with "Couldn't restore task â€œâ€¦â€". A `409` shows the server's message: saving a task with a label archived in another tab shows "Archived labels cannot be attached to a task". Before this change the task form showed "Something went wrong" for that `409`; `mapTaskError` now keeps the server's wording for a `409` that has one. A `500` on `/archive` shows "Couldn't load your archive." with Try again, which loads it again. A `401` clears the session and opens `/login`.
- FE-ARC-06 is Failing: only the label picker's active-only list is covered. Archived items being left out of the default task, project, dashboard and search views is not tested yet.

### 2.3 End-to-End

| ID         | Test Case                                     | Expected Result                                                                                                      | Status  |
| ---------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-ARC-01 | Archive and restore a task                    | The task disappears from active results, appears in Archive, and returns to active results after restore and reload. | Passing |
| E2E-ARC-02 | Archive and restore a project                 | The project is absent from active project views, remains in Archive, and is restored with its tasks intact.          | Passing |
| E2E-ARC-03 | Archive and restore a label                   | The label is absent from active label choices, retains existing assignments, and is usable again after restore.      | Passing |
| E2E-ARC-04 | Browse archived items across types and pages  | Type selection, totals, and cursor pagination show the expected archived tasks, projects, and labels.                | Failing |
| E2E-ARC-05 | Keep archived resources out of ordinary views | Archived items do not appear in active lists or search unless the explicit include-archives option is selected.      | Passing |

Tests: `tests/e2e/archive/archive.e2e.spec.ts` (2 tests); run with `npm run test:e2e -- organization/ settings/ archive/ search/` from the repository root (headless Chromium; all five Sprint 5 specs passed twice in a row with `--repeat-each=2` on 22 November 2026, on a locally seeded database). They sign in as `harvey`, check what the page shows against service-role queries, and put the archive state of Harvey's tasks, labels and projects back after each test, failing if it differs from the seed.

- E2E-ARC-01: in `Filtering - Client Work`, Archive on "Archive fixture - active task" shows "Task â€œâ€¦â€ archived" with Undo; Undo restores it (also in the database). Archived again, it is gone from the project list after a reload and from the Home Tasks tab, and it is listed on `/archive` under All and Tasks. Its edit page opens read-only, with the banner, a disabled title and Save. Restored from `/archive`, it is back in its project's list.
- E2E-ARC-02: Archive on Weekly Notes in the project switcher moves it from My projects to the Archived group, and `/archive` lists it under Projects. Restored from `/archive`, it is back among active projects with every one of its tasks. The Inbox has no Archive action.
- E2E-ARC-03: archiving the Review label in Settings > Labels removes it from the + New task label picker, while "Filter fixture 03" still shows Review, greyed with the title "Review (archived)". `/archive` lists it under Labels, and after restoring it the picker offers it again.
- E2E-ARC-05: an archived task stays out of the project list and the Home Tasks tab, and archived items only show up in search with Include archived (see E2E-SRCH-03). On `/archive`, Harvey's Tasks tab shows exactly his archived tasks, with the right count, and none of James's.
- E2E-ARC-04 is Failing: tab selection and totals are covered, but the seed has fewer than 20 archived items per user, so cursor pagination (Load more) is not exercised end to end. FE-ARC-03 covers it with faked responses.

## 3. Labels & Priorities Management

### 3.1 Backend Integration Tests

| ID        | Test Case                                              | Expected Result                                                                                                                  | Status  |
| --------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-LPM-01 | List and create priorities                             | Priorities are caller-scoped and ordered by `sortOrder`; creation trims and validates names and applies the documented defaults. | Failing |
| BE-LPM-02 | Get and update priorities                              | Owned priorities return their task count/default flag; partial name/color updates persist without changing other fields.         | Failing |
| BE-LPM-03 | Delete a priority with task reassignment               | Used priorities require a different owned `reassignTo`; tasks move successfully and deleting the default transfers the default.  | Failing |
| BE-LPM-04 | Enforce priority deletion rules                        | The last priority cannot be deleted; invalid targets, self-reassignment, and missing reassignment return the documented errors.  | Failing |
| BE-LPM-05 | Set a task priority and filter by priority             | Task priority assignment persists the selected priority object; caller-owned priority names filter tasks correctly.              | Failing |
| BE-LPM-06 | Reorder priorities                                     | A complete permutation updates ordering; missing, duplicate, or foreign IDs are rejected without partial changes.                | Failing |
| BE-LPM-07 | Create, list, update, and delete labels                | Label CRUD persists names/colors and task counts, enforces per-user uniqueness, and soft-deleted labels are not returned.        | Failing |
| BE-LPM-08 | Reorder labels and preserve task assignments           | A complete permutation orders active labels; invalid or incomplete lists are rejected and assignments remain intact.             | Failing |
| BE-LPM-09 | Enforce label/task ownership and archive rules         | Cross-user links are rejected; archived labels cannot be attached and archived tasks cannot be relabeled.                        | Failing |
| BE-LPM-10 | Reject invalid and unauthenticated management requests | Invalid bodies, colors, IDs, and duplicate names return documented errors; protected routes return 401 without a token.          | Failing |

### 3.2 Frontend Integration Tests

| ID        | Test Case                                      | Expected Result                                                                                                  | Status  |
| --------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------- |
| FE-LPM-01 | Manage priority names, colors, and ordering    | The page loads priorities and reflects successful create, edit, reorder, and delete responses.                   | Passing |
| FE-LPM-02 | Select a default priority                      | The selected level becomes the default and is used for new tasks when no priority is explicitly supplied.        | Passing |
| FE-LPM-03 | Delete a priority used by tasks                | The UI requires a valid reassignment target and updates affected tasks and counts after success.                 | Passing |
| FE-LPM-04 | Manage label names, colors, and ordering       | The page reflects successful label CRUD and reorder operations, including updated task counts.                   | Passing |
| FE-LPM-05 | Assign priorities and labels to tasks          | Task forms send selected IDs, display returned priority/label data, and prevent selection of archived labels.    | Failing |
| FE-LPM-06 | Report validation, conflict, and server errors | Duplicate names and other API errors are visible in context; failed changes do not replace the last saved state. | Passing |

Tests: `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`; run with `npm run test:run` from `frontend` (17 tests; the whole frontend suite passed on 14 November 2026). They go through the real `/settings/labels` and `/settings/priorities` routes behind `authGuard` and the settings layout, and the real task list and task form, with the real `LabelsService`, `PrioritiesService`, `PrioritiesStore`, `SettingsStore`, `TaskService` and `TasksStore`. `providePriorityLevels()` and `provideUserSettings()` are registered as in `app.config.ts`, so signing in loads the user's levels and settings. Only the network is faked, with the backend's bodies and status codes (`toLabelModel`, `toPriorityModel`, `toTaskModel` and the controllers' error bodies), and `http.verify()` runs after every test.

- Settings layout: `/settings` opens Profile, and all five tabs (Profile, Preferences, Config, Labels, Priorities) link to their pages.
- FE-LPM-01: the list shows levels in order with the Default badge and task counts. Create sends `POST /priorities` with the name and color, edit sends `PUT /priorities/:id`, and Move up sends `PUT /priorities/reorder` with every id. The backend answers reorder with the reordered levels, not the documented `{ priorityIds }`; the page does not read the body.
- FE-LPM-02: Set as default sends `PUT /priorities/:id/default` and moves the badge. A new task in the task form preselects the default level and sends it as `priorityId`.
- FE-LPM-03: deleting a used level asks where its tasks go and will not send until a level is chosen. It then sends `DELETE /priorities/:id?reassignTo=â€¦`, and the chosen level's task count goes up by the moved tasks. An unused level is deleted without `reassignTo`. When only one level is left, its Delete button is disabled.
- FE-LPM-04: labels are listed in order with task counts. Create, rename and recolor send the trimmed name and an upper-case color; an edit keeps the task count, since `PUT` answers without one. Delete asks first and names the number of tasks that lose the label. Drag (a CDK drop) and Move up/down each send `PUT /labels/reorder` with every active id.
- FE-LPM-05 stays Failing: the priority picker and the task-list priority filter show the user's own levels in order, and each task's priority badge uses its level's color. Assigning labels in the task form and keeping archived labels out of it are not covered yet.
- FE-LPM-06: a name already in use is caught as it is typed; a `409` from the server shows "Label â€œâ€¦â€ already exists." A failed reorder puts the old order back with a toast. A `500` on load shows Try again, and the retry loads the page. If priorities fail before any load, the built-in levels are shown, read-only, with Try again. A `401` clears the session and opens `/login`.
- Backend gaps found while matching the bodies: `PUT /labels/reorder` has no backend route yet. `DELETE /priorities/:id` and `PUT /priorities/:id/default` answer with the full level instead of the documented bodies. `PrioritiesStore` now works out the moved-task count when `tasksReassigned` is missing; before this fix the count showed "NaN tasks".
- A failed refresh on the Priorities page, after the levels loaded at sign-in, keeps those levels without an alert or retry.

### 3.3 End-to-End

| ID         | Test Case                                            | Expected Result                                                                                                       | Status  |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-LPM-01 | Create and edit a priority, then assign it to a task | The priority appears in management and task views and remains assigned after reload.                                  | Passing |
| E2E-LPM-02 | Reorder priorities and labels                        | Both management lists retain the chosen order after reload.                                                           | Failing |
| E2E-LPM-03 | Delete a used priority and reassign its tasks        | The selected target priority is applied to affected tasks and the removed priority no longer appears.                 | Passing |
| E2E-LPM-04 | Create, assign, edit, and remove a label             | The task reflects the saved label set; management changes persist after reload without affecting another user's data. | Failing |

Tests: `tests/e2e/settings/labels-priorities.e2e.spec.ts` (2 tests, plus 1 `fixme`); run with `npm run test:e2e -- organization/ settings/` from the repository root (headless Chromium; passed twice in a row with `--repeat-each=2` and again as a separate run on 20 November 2026, on a locally seeded database). They sign in as `harvey` and use `alex` as the other user, check what the page shows against service-role queries, and put every changed row back after each test, failing if Harvey's seeded rows differ afterwards.

- E2E-LPM-01: Settings > Priorities creates "Urgent", moves it to the top with Move up and makes it the default; both are kept after a reload. A new task in the Inbox preselects Urgent, is saved with Urgent's `priority_id`, and comes first when the list is sorted by Priority.
- E2E-LPM-03: deleting Urgent asks where its tasks go; choosing High sends `DELETE /priorities/:id?reassignTo=<High>`, the level disappears and the task now has High's `priority_id`. Alex still sees only Low, Medium and High.
- E2E-LPM-02 is Failing: reordering priorities passes, but `PUT /api/labels/reorder` has no backend route. The request falls through to `PUT /api/labels/:labelId`, which answers `400`, so the page puts the old order back. The label reorder test is written and marked `test.fixme` until the route exists.
- E2E-LPM-04 is Failing: creating, renaming and deleting a label is covered, and the task form's label choices and the filter bar's Labels panel follow each change. Assigning the label to a task and checking another user's labels are not covered yet.
- Fixed while writing these tests: `PUT /api/priorities/reorder` was registered after `PUT /api/priorities/:priorityId`, so Express took `reorder` as an id and every reorder answered `400` "Priority ID must be a positive integer". The route now comes first.
- Found, not fixed: deleting the default level (Urgent here) leaves Harvey with no default level; BE-LPM-03 expects the default to move to another level.

## 4. Settings (Configuration & Preferences)

### 4.1 Backend Integration Tests

| ID        | Test Case                                      | Expected Result                                                                                                            | Status  |
| --------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-SET-01 | Get settings for a user without a settings row | The endpoint creates or returns the documented defaults for dashboard limits, font size, and font family.                  | Failing |
| BE-SET-02 | Partially update settings                      | Supplied settings persist and omitted fields retain their previous values; the response includes all fields and timestamp. | Failing |
| BE-SET-03 | Validate settings values and unknown fields    | Empty updates, unknown keys, invalid fonts, and limits outside 1-50 return 400 without changing saved settings.            | Failing |
| BE-SET-04 | Scope settings to the authenticated user       | Each user sees and updates only their own settings; missing or invalid authentication returns 401.                         | Failing |
| BE-SET-05 | Apply configured dashboard limits              | Omitted dashboard limits use the caller's preference; explicit valid limits override it and `total` remains pre-limit.     | Failing |

### 4.2 Frontend Integration Tests

| ID        | Test Case                                         | Expected Result                                                                                                   | Status  |
| --------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------- |
| FE-SET-01 | Load settings and apply saved preferences         | The settings UI and application use the values returned by `GET /settings`, including defaults for a new user.    | Passing |
| FE-SET-02 | Save dashboard limits and appearance preferences  | Valid changes send a partial `PATCH`, show success, and remain applied after the settings response is refreshed.  | Passing |
| FE-SET-03 | Reject invalid settings and preserve saved values | Invalid values are prevented or reported; a failed save does not replace the last successfully saved preferences. | Passing |
| FE-SET-04 | Apply dashboard item limits                       | Dashboard requests use configured task/project limits and render the returned items and total correctly.          | Passing |
| FE-SET-05 | Handle settings load or update failure            | A visible error and retry path are provided without silently reverting or displaying success-shaped defaults.     | Passing |

Tests: `frontend/tests/integration/features/settings/settings.integration.spec.ts`; run with `npm run test:run` from `frontend` (13 tests; the whole frontend suite passed on 14 November 2026). They go through the real app shell and the `/login`, `/settings/config`, `/settings/preferences`, `/dashboard` and `/home` routes behind `authGuard`, with the real `SettingsService`, `SettingsStore`, `SessionService`, `DashboardService`, the dashboard sections and the home project list. `providePriorityLevels()` and `provideUserSettings()` are registered as in `app.config.ts`. Only the network and the dashboard clock are faked, with the backend's bodies (`toUserSettingsModel`, the validate-request `400` body, the dashboard `{ tasks }` and `toProjectModel`), and `http.verify()` runs after every test.

- FE-SET-01: after logging in through `/login`, the saved size and font from `GET /settings` are set on `<html>` (`--app-font-size`, `--app-font-family`) and cached. They are already there while `/dashboard` is still loading its tasks. On a reload, the cached size and font are applied before `GET /auth/me` or `GET /settings` is answered, so there is no flash. Logging out clears the cache and puts the default look back. A user on the defaults sees 5 and 5, Medium and System.
- FE-SET-02: in Preferences, picking a size or font changes the preview and the whole page at once. Save sends `PATCH /settings` with `{ fontSize, fontFamily }` and shows "Preferences saved."; Cancel puts the saved values back without a request. In Config, saving 3 tasks and 4 projects sends `PATCH /settings` with only the two limits. Reset to defaults sends 5 and 5 straight away.
- FE-SET-03: 0 and 51 show "Choose a number from 1 to 50." and Save stays disabled, so nothing is sent. A `400` shows the server's message ("Invalid settings update: â€¦"), and the saved limits and cache stay as they were.
- FE-SET-04: with limits of 3 and 4, Current & Upcoming and Overdue each list 3 tasks with View all (6) and View all (5). The home project list shows 4 projects (Inbox included) with View all (7), which opens `/home?tab=projects` with every project. The limits are applied in the browser: the dashboard endpoints take no limit and send no `total` yet (see BE-SET-05), so the totals come from the full list the server sends.
- FE-SET-05: a `500` on `GET /settings` shows "Couldn't load your settings." with Try again, Save stays disabled until the settings load, and the retry loads and applies them. A `401` clears the session and the cached settings and opens `/login`.
- The `400` message is new: Config and Preferences used to show a fixed "Couldn't saveâ€¦" message for every failure. They now show the server's `error` and `details` messages for a `400`; other failures keep the fixed message.

### 4.3 End-to-End

| ID         | Test Case                                | Expected Result                                                                                | Status  |
| ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ------- |
| E2E-SET-01 | Change font size and font family         | The application appearance changes and remains selected after reload and sign-in.              | Passing |
| E2E-SET-02 | Change dashboard task and project limits | Dashboard sections honor the saved limits and display the matching total count after reload.   | Passing |
| E2E-SET-03 | Keep preferences isolated between users  | Changes made by one account do not alter another account's settings or application appearance. | Passing |

Tests: `tests/e2e/settings/settings.e2e.spec.ts` (2 tests); run with `npm run test:e2e -- organization/ settings/` from the repository root (headless Chromium; passed twice in a row with `--repeat-each=2` and again as a separate run on 20 November 2026, on a locally seeded database). They sign in as `harvey` and use `alex` as the other user, check what the page shows against service-role queries, and put every changed row back after each test, failing if Harvey's seeded rows differ afterwards.

- E2E-SET-02: Settings > Config saves 3 tasks and 4 projects with `PATCH /settings`. At 1280 px and 390 px wide, the home dashboard's three status columns and All Tasks each show at most 3 tasks, with "View all (N)" whenever there are more. All Tasks always offers it for Harvey. The sidebar shows 4 projects with "View all (N)", where N is Harvey's active projects by service-role count. On `/dashboard`, Current & Upcoming and Overdue are capped the same way, and no two widgets overlap at either width.
- E2E-SET-01: Settings > Preferences applies Large and Serif to the whole page as soon as they are picked, before saving (`--app-font-size` 112.5%, Georgia, and a larger body font). Save stores them, and they are still applied after a reload and after signing in from a fresh browser context with no cached settings.
- E2E-SET-03: after Harvey saves Large and Serif, Alex's saved settings and the page Alex sees keep Medium and System.

## 5. Search

### 5.1 Backend Integration Tests

| ID         | Test Case                                           | Expected Result                                                                                                                            | Status  |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| BE-SRCH-01 | Search task titles, descriptions, and project names | Case-insensitive literal matching returns each matching resource once with the correct matched field and a short task snippet.             | Failing |
| BE-SRCH-02 | Rank and order search results                       | Exact matches precede prefixes, prefixes precede contains matches, and ties are ordered by most recently updated.                          | Failing |
| BE-SRCH-03 | Filter search result types and limits               | `type` returns the requested groups, each group is independently capped, and totals count all matching results before limiting.            | Failing |
| BE-SRCH-04 | Exclude or explicitly include archived resources    | Archived tasks and projects, including tasks in archived projects, are excluded by default and included only when requested.               | Failing |
| BE-SRCH-05 | Scope search and exclude deleted resources          | Search returns only the caller's non-deleted resources and does not disclose foreign or soft-deleted rows.                                 | Failing |
| BE-SRCH-06 | Validate search query parameters                    | Missing, short, or long queries, invalid types, limits, and archive flags return 400; wildcard characters and backslashes match literally. | Failing |
| BE-SRCH-07 | Require authentication for search                   | Missing, invalid, or expired credentials return 401 and no search results.                                                                 | Failing |

### 5.2 Frontend Integration Tests

| ID         | Test Case                                                 | Expected Result                                                                                                         | Status  |
| ---------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-SRCH-01 | Search tasks and projects                                 | The query, selected type, and result limit are sent correctly; results render in their task/project groups with totals. | Passing |
| FE-SRCH-02 | Display match context and open a result                   | Task matched-field/snippet and project match context are shown; selecting a result opens the corresponding resource.    | Passing |
| FE-SRCH-03 | Include archived results                                  | Archived results are absent by default and appear when the user explicitly enables archived results.                    | Passing |
| FE-SRCH-04 | Handle empty results, invalid input, and request failures | Empty results have a clear state, short queries are handled per contract, and failures are visible with a retry path.   | Passing |

Tests: `frontend/tests/integration/features/search/search.integration.spec.ts`; run with `npm run test:run` from `frontend` (13 tests; the whole frontend suite passed on 22 November 2026). They go through the real app shell behind `authGuard`, with the real top-bar search box, search results and `/search` page, `SearchService`, `ProjectService`, the stores and `authInterceptor`. Only the network and the debounce timers are faked: `GET /search` answers with the backend's `{ tasks, projects }` groups of `toSearchTaskResult`/`toSearchProjectResult` items with totals, errors use require-auth's `401` and the error handler's `500`, and `http.verify()` runs after every test. The debounce runs on Vitest's fake `setInterval` and `Date`, which rxjs's `timer` uses.

- FE-SRCH-01: Ctrl+K, Cmd+K and `/` focus the search box from anywhere; `/` typed in another text field stays a slash. One character sends nothing. Typing "wr", "wri", "writ" in quick succession sends one `GET /search?q=writ&type=all&limit=5&includeArchived=false` after 300 ms without input. A newer query cancels the older request, and only the newer answer is shown. The dropdown groups results under "Tasks" and "Projects" with the server's totals. `/search?q=writ` sends `limit=20` and shows every result with All, Tasks and Projects tabs and their counts, plus "N more matches not shown" when the totals are larger. The UI always sends `type=all`: the tabs filter the loaded results (and keep the choice in the URL as `type=`) instead of sending a new request, so both counts come from one call.
- FE-SRCH-02: matches are highlighted with `<mark>`, case-insensitively, in titles, project names and description snippets. A description match shows an "in description" tag and the text around the match. Tasks show their project name and due date from the app's stores. A snippet containing `<script>â€¦</script>` is shown as plain text, and no element is created from it. Arrow keys move the active option (wrapping at both ends, with `aria-activedescendant`), Enter opens it: a task opens at `/projects/:projectId/tasks/:taskId/edit`, a project at its task list. Escape closes the results and stays on the page. On `/search`, clicking a result opens it the same way.
- FE-SRCH-03: "Include archived" is off by default (`includeArchived=false`, and the empty state says "Archived items are hidden."). Turning it on sends `includeArchived=true` straight away, without waiting for typing, keeps focus in the box, and archived results carry an "Archived" tag.
- FE-SRCH-04: a query with no matches shows "No tasks or projects match â€œâ€¦â€." and announces "No results". A `500` shows "Search isn't working right now." with Try again, which sends the same query again at once. A `401` clears the session and opens `/login`. Queries shorter than 2 characters are not sent; the server's 100-character limit is enforced by the field's `maxlength`.

### 5.3 End-to-End

| ID          | Test Case                                  | Expected Result                                                                                            | Status  |
| ----------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------- |
| E2E-SRCH-01 | Find and open a task or project            | Search returns the matching task/project and navigation opens the correct resource.                        | Passing |
| E2E-SRCH-02 | Verify ranking and matched-field context   | Exact, prefix, and contains results are ordered as specified, with task title/description context visible. | Passing |
| E2E-SRCH-03 | Search archived and active resources       | Active resources appear by default; archived resources appear only after enabling the archive option.      | Passing |
| E2E-SRCH-04 | Search with no matches and as another user | No-match state is clear, and one user's tasks and projects never appear in another user's results.         | Passing |

Tests: `tests/e2e/search/search.e2e.spec.ts` (2 tests); run with `npm run test:e2e -- organization/ settings/ archive/ search/` from the repository root (headless Chromium; all five Sprint 5 specs passed twice in a row with `--repeat-each=2` on 22 November 2026, on a locally seeded database). They sign in as `harvey`, check what the page shows against service-role queries, and restore the seeded session rows after each test; searching changes no data, which afterEach checks.

- E2E-SRCH-01: Ctrl/Cmd+K focuses the search box. "launch" finds the "Orbit launch checklist" task and the "Orbit launch workspace" project under Tasks and Projects, with the match highlighted. Arrow keys and Enter open the task at `/projects/:projectId/tasks/:taskId/edit` and the project at its task list. Escape closes the results.
- E2E-SRCH-02: "accented", a word only in the description of "Search fixture - CafÃ© run", finds that task with an "in description" tag and the highlighted snippet. For "Orbit", each group lists the exact match first, then the prefix match, then contains matches. A description-only match ranks as contains, per the API specification, and Weekly Notes is tagged "in description".
- E2E-SRCH-03: "ArchiveNeedle" finds nothing by default ("Archived items are hidden."), since all of Harvey's ArchiveNeedle fixtures are archived. With Include archived it sends `includeArchived=true`, and the archived task and project appear with an "Archived" tag.
- E2E-SRCH-04: a term with no match shows the empty state. James's "James ArchiveNeedle task fixture" and "James Orbit task fixture" never appear for Harvey, and no title shown belongs to James (by service-role check).

## Notes

- Sorting & Filtering backend rows remain Blocked pending Tech Lead approval of the draft API contract. Do not start that backend implementation before approval.
- Every E2E row remains Blocked until its relevant backend and frontend integration cases pass. E2E tests should verify persistence after reload and isolate their created data.
- Archive must remain distinct from soft deletion. Archive/restore is reversible and idempotent; Inbox cannot be archived, and archived task restrictions follow the API specification.
- Search should treat `%`, `_`, and backslash literally, scope all results to the authenticated user, and exclude soft-deleted resources.
- Dashboard limits are user settings. Explicit endpoint limits override preferences; response totals count all matches before limits are applied.
- No row is marked Passing until its test has run successfully against the documented contract. Resolve any API-spec changes before updating expected results.
