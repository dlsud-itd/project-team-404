# Sprint 5 Test Matrix

## Overview

This matrix covers Sorting & Filtering, Archive, Labels & Priorities Management, Settings (Configuration & Preferences), and Search across backend integration, frontend integration, and end-to-end tests. The Sprint 5 [API Specification](<./Team-404 - API Specification - Filtering, Archive, Labels & Priorities, Settings & Search.md>) defines the routes, fields, validation, and response contracts. Expected results below describe observable behavior; use the specification for exact request and response shapes.

Sorting & Filtering backend implementation is gated on Tech Lead approval of the draft API specification. Its backend and frontend integration rows are therefore blocked. Every end-to-end row is blocked until the relevant backend and frontend integration cases pass; this includes all Sorting & Filtering E2E rows.

Backend integration tests should use the isolated Supabase test project and verify persisted state, ownership, and non-mutation on errors. Frontend integration tests should exercise the real routes, components, and services while controlling HTTP responses. End-to-end tests should exercise the integrated application with isolated test data and verify state after reload.

Run backend integration tests with `npm run test:integration` from `backend`, frontend tests with `npm run test:run` from `frontend`, and E2E tests with `npm run test:e2e` from the repository root.

Status values: `Failing` means the case is planned but not yet passing; `Blocked` means a prerequisite must pass first; `Passing` means verified.

## 1. Sorting & Filtering

### 1.1 Backend Integration Tests

| ID       | Test Case                                                    | Expected Result                                                                                                                                                                  | Status  |
| -------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-SF-01 | List tasks with defaults and legacy filters                  | Omitted filters return active tasks by default; `status`, `isDone`, `priority`, and `labelId` retain their documented compatibility and conflict rules.                           | Blocked |
| BE-SF-02 | Combine task filters                                        | Project, status, priority, label, date bounds, due-date presence, overdue, and recurrence filters combine with AND; multiple priorities use OR.                                  | Blocked |
| BE-SF-03 | Match tasks against multiple labels                         | `labelMatch=any` returns tasks with at least one requested label; `all` requires every label; results are unique.                                                                | Blocked |
| BE-SF-04 | Filter tasks by dates and user-local overdue status          | Inclusive `dueFrom`/`dueTo` bounds are honored, and `overdue=true` uses the caller's timezone and excludes completed tasks.                                                     | Blocked |
| BE-SF-05 | Sort tasks by every supported field and direction            | Each supported `orderBy` and `orderDirection` is honored; null dates sort last, priority uses `sortOrder`, and task ID breaks ties stably.                                      | Blocked |
| BE-SF-06 | Reject invalid or conflicting task query parameters          | Unsupported values, malformed IDs/dates, duplicate or conflicting parameters, invalid ranges, and limit violations return 400 without changing data.                            | Blocked |
| BE-SF-07 | Scope task filtering and sorting to the caller               | Another user's tasks, labels, priorities, and projects cannot be read or inferred through filters; unauthenticated requests return 401.                                          | Blocked |
| BE-SF-08 | Filter and sort projects                                     | Favorite, archive, color, and ordering filters return only matching caller-owned projects with the documented stable ID tie-breaker.                                            | Blocked |
| BE-SF-09 | Limit project results and preserve the legacy response       | A valid limit returns `{ projects, total }` with the total before limiting; an omitted limit preserves the existing Sprint 2 project response and behavior.                       | Blocked |
| BE-SF-10 | Reject invalid project filters, ordering, and limits         | Invalid booleans, colors, sort fields/directions, and limits return 400; missing or invalid authentication returns 401.                                                          | Blocked |

These backend cases remain blocked until Tech Lead approval of the Sorting & Filtering API contract.

### 1.2 Frontend Integration Tests

| ID       | Test Case                                                    | Expected Result                                                                                                                                    | Status  |
| -------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-SF-01 | Filter tasks by project, status, and priority                | Controls send the selected supported query parameters and render only the returned matching tasks.                                                 | Blocked |
| FE-SF-02 | Filter tasks by labels and date criteria                     | Label any/all, due-date bounds, has-due-date, overdue, and recurring controls send the expected query and display the response.                     | Blocked |
| FE-SF-03 | Sort tasks and projects                                       | Selecting a supported sort field and direction requests that order and renders the response order, including null values and ties.                   | Blocked |
| FE-SF-04 | Filter projects and use the result limit                     | Favorite, archive, and color filters are sent correctly; a limited response renders its projects and matching total.                                  | Blocked |
| FE-SF-05 | Validate unsupported filters and handle failed requests      | Invalid choices are prevented or reported; a server error is visible and the last successful results remain available for retry.                    | Blocked |
| FE-SF-06 | Preserve existing project-list behavior without a limit      | Existing project views continue to render the legacy response when no `limit` is requested.                                                         | Blocked |

These frontend cases are blocked until the Sorting & Filtering backend contract is approved and its relevant backend integration cases pass.

### 1.3 End-to-End

| ID        | Test Case                                               | Expected Result                                                                                                   | Status  |
| --------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-SF-01 | Combine task filters and reload the results            | Only tasks matching the selected criteria appear, and the same result set is shown after reload.                  | Blocked |
| E2E-SF-02 | Sort tasks and projects                                | Results follow the selected order, including stable ties and null-date placement, after reload.                    | Blocked |
| E2E-SF-03 | Filter tasks by due-date range and overdue status      | Inclusive date bounds and the user's timezone determine the displayed tasks correctly.                           | Blocked |
| E2E-SF-04 | Filter projects and limit the list                     | Matching projects and the total count are displayed; existing project pages continue to work without a limit.     | Blocked |

All Sorting & Filtering E2E cases remain blocked until the draft contract is approved and their relevant backend and frontend integration rows pass.

## 2. Archive

### 2.1 Backend Integration Tests

| ID        | Test Case                                                     | Expected Result                                                                                                           | Status  |
| --------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-ARC-01 | Archive and restore a task                                   | Archive and restore persist `isArchived` and `archivedAt`; repeating either request is idempotent.                         | Failing |
| BE-ARC-02 | Enforce archived task restrictions                           | Archived tasks cannot be edited, completed, scheduled, reprioritized, or relabeled; DELETE remains allowed.               | Failing |
| BE-ARC-03 | Archive and restore projects                                 | Owned projects archive and restore idempotently; archiving Inbox returns the documented 409 conflict.                      | Failing |
| BE-ARC-04 | Archive and restore labels                                   | Owned labels archive and restore idempotently; existing task links remain, but archived labels cannot be newly assigned.   | Failing |
| BE-ARC-05 | List archived items by type and page                          | `/archive` returns every group, filters by type, sorts newest archived first, and reports total and next cursor correctly. | Failing |
| BE-ARC-06 | Exclude deleted and foreign resources from archive             | Soft-deleted rows are omitted; callers cannot see another user's archived items.                                           | Failing |
| BE-ARC-07 | Exclude archives from ordinary lists and dashboards           | Default task, project, label, dashboard, and search results exclude archived resources; explicit archive filters work.     | Failing |
| BE-ARC-08 | Reject invalid archive input and handle missing resources      | Invalid IDs/bodies/cursors return 400, unauthenticated calls return 401, and missing or foreign resources return 404.       | Failing |

### 2.2 Frontend Integration Tests

| ID        | Test Case                                                    | Expected Result                                                                                                               | Status  |
| --------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-ARC-01 | Archive and restore a task                                   | The UI sends the correct archive state, removes the task from active results, and restores it to active results on success.   | Blocked |
| FE-ARC-02 | Archive and restore a project or label                       | Successful actions update active and archived views without losing the resource's associated tasks or labels.                  | Blocked |
| FE-ARC-03 | Browse archive groups, filters, and pages                    | Type filters show the selected group; totals and next-page behavior match the API response.                                    | Blocked |
| FE-ARC-04 | Prevent or report actions forbidden for archived resources  | Archived tasks are read-only except for delete/restore; archived labels cannot be newly selected for a task.                  | Blocked |
| FE-ARC-05 | Handle archive failures                                      | A visible error is shown for failed archive, restore, or list requests, and the last successful state is preserved.             | Blocked |
| FE-ARC-06 | Honor active-only defaults                                   | Ordinary task, project, label, dashboard, and search views do not show archived items unless the user explicitly includes them. | Blocked |

### 2.3 End-to-End

| ID         | Test Case                                                   | Expected Result                                                                                                      | Status  |
| ---------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-ARC-01 | Archive and restore a task                                  | The task disappears from active results, appears in Archive, and returns to active results after restore and reload. | Blocked |
| E2E-ARC-02 | Archive and restore a project                               | The project is absent from active project views, remains in Archive, and is restored with its tasks intact.          | Blocked |
| E2E-ARC-03 | Archive and restore a label                                 | The label is absent from active label choices, retains existing assignments, and is usable again after restore.     | Blocked |
| E2E-ARC-04 | Browse archived items across types and pages                | Type selection, totals, and cursor pagination show the expected archived tasks, projects, and labels.                 | Blocked |
| E2E-ARC-05 | Keep archived resources out of ordinary views               | Archived items do not appear in active lists or search unless the explicit include-archives option is selected.      | Blocked |

## 3. Labels & Priorities Management

### 3.1 Backend Integration Tests

| ID        | Test Case                                                    | Expected Result                                                                                                                  | Status  |
| --------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-LPM-01 | List and create priorities                                   | Priorities are caller-scoped and ordered by `sortOrder`; creation trims and validates names and applies the documented defaults. | Failing |
| BE-LPM-02 | Get and update priorities                                    | Owned priorities return their task count/default flag; partial name/color updates persist without changing other fields.          | Failing |
| BE-LPM-03 | Delete a priority with task reassignment                     | Used priorities require a different owned `reassignTo`; tasks move successfully and deleting the default transfers the default.   | Failing |
| BE-LPM-04 | Enforce priority deletion rules                              | The last priority cannot be deleted; invalid targets, self-reassignment, and missing reassignment return the documented errors.    | Failing |
| BE-LPM-05 | Set a task priority and filter by priority                   | Task priority assignment persists the selected priority object; caller-owned priority names filter tasks correctly.               | Failing |
| BE-LPM-06 | Reorder priorities                                           | A complete permutation updates ordering; missing, duplicate, or foreign IDs are rejected without partial changes.                  | Failing |
| BE-LPM-07 | Create, list, update, and delete labels                      | Label CRUD persists names/colors and task counts, enforces per-user uniqueness, and soft-deleted labels are not returned.         | Failing |
| BE-LPM-08 | Reorder labels and preserve task assignments                 | A complete permutation orders active labels; invalid or incomplete lists are rejected and assignments remain intact.             | Failing |
| BE-LPM-09 | Enforce label/task ownership and archive rules                | Cross-user links are rejected; archived labels cannot be attached and archived tasks cannot be relabeled.                         | Failing |
| BE-LPM-10 | Reject invalid and unauthenticated management requests       | Invalid bodies, colors, IDs, and duplicate names return documented errors; protected routes return 401 without a token.           | Failing |

### 3.2 Frontend Integration Tests

| ID        | Test Case                                                    | Expected Result                                                                                                                         | Status  |
| --------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-LPM-01 | Manage priority names, colors, and ordering                 | The page loads priorities and reflects successful create, edit, reorder, and delete responses.                                           | Blocked |
| FE-LPM-02 | Select a default priority                                   | The selected level becomes the default and is used for new tasks when no priority is explicitly supplied.                                | Blocked |
| FE-LPM-03 | Delete a priority used by tasks                             | The UI requires a valid reassignment target and updates affected tasks and counts after success.                                          | Blocked |
| FE-LPM-04 | Manage label names, colors, and ordering                    | The page reflects successful label CRUD and reorder operations, including updated task counts.                                           | Blocked |
| FE-LPM-05 | Assign priorities and labels to tasks                       | Task forms send selected IDs, display returned priority/label data, and prevent selection of archived labels.                            | Blocked |
| FE-LPM-06 | Report validation, conflict, and server errors              | Duplicate names and other API errors are visible in context; failed changes do not replace the last saved state.                          | Blocked |

### 3.3 End-to-End

| ID          | Test Case                                                    | Expected Result                                                                                                       | Status  |
| ----------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-LPM-01  | Create and edit a priority, then assign it to a task         | The priority appears in management and task views and remains assigned after reload.                                  | Blocked |
| E2E-LPM-02  | Reorder priorities and labels                                | Both management lists retain the chosen order after reload.                                                           | Blocked |
| E2E-LPM-03  | Delete a used priority and reassign its tasks                | The selected target priority is applied to affected tasks and the removed priority no longer appears.                  | Blocked |
| E2E-LPM-04  | Create, assign, edit, and remove a label                     | The task reflects the saved label set; management changes persist after reload without affecting another user's data. | Blocked |

## 4. Settings (Configuration & Preferences)

### 4.1 Backend Integration Tests

| ID        | Test Case                                                    | Expected Result                                                                                                         | Status  |
| --------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-SET-01 | Get settings for a user without a settings row               | The endpoint creates or returns the documented defaults for dashboard limits, font size, and font family.               | Failing |
| BE-SET-02 | Partially update settings                                    | Supplied settings persist and omitted fields retain their previous values; the response includes all fields and timestamp. | Failing |
| BE-SET-03 | Validate settings values and unknown fields                  | Empty updates, unknown keys, invalid fonts, and limits outside 1-50 return 400 without changing saved settings.           | Failing |
| BE-SET-04 | Scope settings to the authenticated user                     | Each user sees and updates only their own settings; missing or invalid authentication returns 401.                       | Failing |
| BE-SET-05 | Apply configured dashboard limits                            | Omitted dashboard limits use the caller's preference; explicit valid limits override it and `total` remains pre-limit.  | Failing |

### 4.2 Frontend Integration Tests

| ID        | Test Case                                                    | Expected Result                                                                                                           | Status  |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-SET-01 | Load settings and apply saved preferences                    | The settings UI and application use the values returned by `GET /settings`, including defaults for a new user.             | Blocked |
| FE-SET-02 | Save dashboard limits and appearance preferences             | Valid changes send a partial `PATCH`, show success, and remain applied after the settings response is refreshed.            | Blocked |
| FE-SET-03 | Reject invalid settings and preserve saved values            | Invalid values are prevented or reported; a failed save does not replace the last successfully saved preferences.          | Blocked |
| FE-SET-04 | Apply dashboard item limits                                  | Dashboard requests use configured task/project limits and render the returned items and total correctly.                    | Blocked |
| FE-SET-05 | Handle settings load or update failure                       | A visible error and retry path are provided without silently reverting or displaying success-shaped defaults.               | Blocked |

### 4.3 End-to-End

| ID          | Test Case                                                    | Expected Result                                                                                                       | Status  |
| ----------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-SET-01  | Change font size and font family                             | The application appearance changes and remains selected after reload and sign-in.                                     | Blocked |
| E2E-SET-02  | Change dashboard task and project limits                    | Dashboard sections honor the saved limits and display the matching total count after reload.                           | Blocked |
| E2E-SET-03  | Keep preferences isolated between users                     | Changes made by one account do not alter another account's settings or application appearance.                         | Blocked |

## 5. Search

### 5.1 Backend Integration Tests

| ID        | Test Case                                                    | Expected Result                                                                                                                          | Status  |
| --------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| BE-SRCH-01 | Search task titles, descriptions, and project names          | Case-insensitive literal matching returns each matching resource once with the correct matched field and a short task snippet.            | Failing |
| BE-SRCH-02 | Rank and order search results                                | Exact matches precede prefixes, prefixes precede contains matches, and ties are ordered by most recently updated.                         | Failing |
| BE-SRCH-03 | Filter search result types and limits                       | `type` returns the requested groups, each group is independently capped, and totals count all matching results before limiting.           | Failing |
| BE-SRCH-04 | Exclude or explicitly include archived resources             | Archived tasks and projects, including tasks in archived projects, are excluded by default and included only when requested.              | Failing |
| BE-SRCH-05 | Scope search and exclude deleted resources                  | Search returns only the caller's non-deleted resources and does not disclose foreign or soft-deleted rows.                                 | Failing |
| BE-SRCH-06 | Validate search query parameters                            | Missing, short, or long queries, invalid types, limits, and archive flags return 400; wildcard characters and backslashes match literally. | Failing |
| BE-SRCH-07 | Require authentication for search                           | Missing, invalid, or expired credentials return 401 and no search results.                                                               | Failing |

### 5.2 Frontend Integration Tests

| ID        | Test Case                                                    | Expected Result                                                                                                              | Status  |
| --------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------- |
| FE-SRCH-01 | Search tasks and projects                                    | The query, selected type, and result limit are sent correctly; results render in their task/project groups with totals.       | Blocked |
| FE-SRCH-02 | Display match context and open a result                      | Task matched-field/snippet and project match context are shown; selecting a result opens the corresponding resource.          | Blocked |
| FE-SRCH-03 | Include archived results                                     | Archived results are absent by default and appear when the user explicitly enables archived results.                           | Blocked |
| FE-SRCH-04 | Handle empty results, invalid input, and request failures     | Empty results have a clear state, short queries are handled per contract, and failures are visible with a retry path.          | Blocked |

### 5.3 End-to-End

| ID          | Test Case                                                    | Expected Result                                                                                                                    | Status  |
| ----------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------- |
| E2E-SRCH-01 | Find and open a task or project                              | Search returns the matching task/project and navigation opens the correct resource.                                                 | Blocked |
| E2E-SRCH-02 | Verify ranking and matched-field context                    | Exact, prefix, and contains results are ordered as specified, with task title/description context visible.                           | Blocked |
| E2E-SRCH-03 | Search archived and active resources                         | Active resources appear by default; archived resources appear only after enabling the archive option.                                | Blocked |
| E2E-SRCH-04 | Search with no matches and as another user                  | No-match state is clear, and one user's tasks and projects never appear in another user's results.                                    | Blocked |

## Notes

- Sorting & Filtering backend rows remain Blocked pending Tech Lead approval of the draft API contract. Do not start that backend implementation before approval.
- Every E2E row remains Blocked until its relevant backend and frontend integration cases pass. E2E tests should verify persistence after reload and isolate their created data.
- Archive must remain distinct from soft deletion. Archive/restore is reversible and idempotent; Inbox cannot be archived, and archived task restrictions follow the API specification.
- Search should treat `%`, `_`, and backslash literally, scope all results to the authenticated user, and exclude soft-deleted resources.
- Dashboard limits are user settings. Explicit endpoint limits override preferences; response totals count all matches before limits are applied.
- No row is marked Passing until its test has run successfully against the documented contract. Resolve any API-spec changes before updating expected results.
