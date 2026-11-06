# Team 404 (HabitFlow) - Sprint 4 Ceremony

Sprint 4: Dashboard & Reporting | November 1-7, 2026 | Last Updated: November 6, 2026 | Version 1.0.0

## Completion

| Sprint 4 Completion | Overall Sprint Tasks Completion | Overall Project Completion |
| ------------------- | ------------------------------- | -------------------------- |
| 14/25 tasks = 56%   | 166/272 tasks = 60%             | 211/322 tasks = 65%        |
| Sprint 4 tasks only | All sprint tasks only           | All tracked project tasks  |

## Sprint Planning

### New Sprints

The main planned Sprint 4 backend features are done. Sprint 5 and Sprint 6 add optional features and polish that are not needed to complete Sprint 4's main goals.

| Sprint   | Focus                               | Dates                |
| -------- | ----------------------------------- | -------------------- |
| Sprint 5 | Search, filtering, and task notes   | November 8-14, 2026  |
| Sprint 6 | Streaks, task order, and task views | November 15-21, 2026 |

### Completed in Sprint 4

| Deliverable                                 | Completed work                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard and Tasks                         | - Connected the Dashboard and Tasks pages to the server through APIs.<br>- Added the Tasks page.<br>- When a project is deleted, its active tasks move to Inbox instead of being deleted. (#68)                                                                                                                                |
| Task Scheduling                             | - Added due dates and repeating tasks.<br>- Added options for the days a task repeats and an optional end date.<br>- Improved date checks and what happens when a repeating task is completed. (#63, #74)                                                                                                                      |
| Current & Upcoming                          | - Added an API and dashboard view for current and upcoming tasks.<br>- Show dates in the user's local time and group tasks by day.<br>- Added Postman tests for the API. (#72, #77)                                                                                                                                            |
| Overdue Tasks                               | - Added an API and dashboard support for overdue tasks.<br>- Finished the backend code and backend integration tests.<br>- Added sample test data and Postman tests. (#73)                                                                                                                                                     |
| Testing                                     | - Added the Sprint 4 test plan.<br>- Finished backend integration tests for Current & Upcoming and Overdue APIs. These check the API and database together.<br>- Added Sprint 2 regression tests to check that older project features still work, and E2E tests for project features to check full user flows. (#71, #75, #76) |
| Local development and automatic checks (CI) | - Improved server tests and limited them to a local test database.<br>- Added local Supabase setup and support for changing test ports.<br>- Made sample test data easier to set up.<br>- Set CI to run server tests using local Supabase. (#70, #78)                                                                          |
| API and Postman guides                      | - Added and improved guides for sign-up, password reset, login, profile, projects, and tasks.<br>- Separated task and label tests and added local test settings.<br>- Replaced API specification PDFs with Markdown files and updated the guides. (#64-#69, #79)                                                               |

### Carried Over to Next Sprint

| Work area                    | Work remaining                                                                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sprint 2: Project Management | - Finish E2E tests for project features.                                                                                                                                                       |
| Sprint 3: Task Management    | - Finish task E2E tests and regression tests.                                                                                                                                                  |
| Current & Upcoming Tasks     | - Finish frontend integration tests, which check the dashboard section with its API.                                                                                                           |
| Overdue Tasks                | - Finish the frontend code and integration tests.                                                                                                                                              |
| Sprint 4 sign-off            | - Run E2E tests for the full dashboard flows after both dashboard features are complete.<br>- Run Sprint 1-4 regression tests after E2E tests pass to check that existing features still work. |

## Sprint Retrospective

### What went well?

- The Current & Upcoming and Overdue backend APIs and backend integration tests are done.
- Repeating tasks can use selected weekdays and an optional end date. Completing a repeating task is also handled.
- Added automated tests and improved the local Supabase database and CI checks.
- Updated and organized the API specifications and Postman guides.

### What could be improved?

- Work from Sprints 2-3 is still open: Sprint 2 project E2E tests and Sprint 3 task E2E and regression tests. Include older tasks when planning and assigning work
- The main Sprint 4 backend features are done, but frontend checks and project sign-off remain.
- E2E, and regression tests are not all complete. Record each test run and its result separately.

### What needs to be done?

- Start Sprint 5 with its test matrix and API specification, then work through sorting and filtering, task notes, and search.
- Finish the carry-over tasks from Sprints 2-4 listed above.
- Finish and record frontend integration tests, then run and record E2E tests using the local Supabase test database.
- Run and record Sprint 1-4 regression tests after the E2E tests pass.
