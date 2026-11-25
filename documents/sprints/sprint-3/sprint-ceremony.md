           Team 404 (HabitFlow) - Sprint 3 Ceremony

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

Completion
Sprint 3 Completion Overall Sprint Completion Overall Project Completion

19 / 35 tasks = 54% 137 / 186 tasks = 73% 182 / 236 tasks = 77%

Sprint 3 tasks only All sprint tasks (Sprints 1-4); All tasks, including non-sprint
non-sprint tasks excluded planning, design and
documentation tasks

Counts come from the Notion Gantt Chart Tasks database as of October 31, 2026.

Sprint Planning

Completed in Sprint 3
Deliverable Completed tasks

Task CRUD Database migrations and seeds; backend code;
backend integration tests; frontend code; frontend
integration tests; end-to-end spec

Task Scheduling Database migrations and seeds (due date,
deadline, recurrence); backend code

Task Organization Database migrations and seeds (priority, labels);
backend code (priority, labels, filtering)

Sprint 3 Documents Sprint 3 Test Matrix (written first, before the code
it covers)

Sprint 2 carry-over: Project CRUD Backend integration tests; frontend integration
tests; remaining frontend tasks

Sprint 2 carry-over: Project Organization Database (migrations); backend code (favorite,
archive, sort order); frontend code; tests
Deliverable Completed tasks

Sprint 1 carry-over: Profile Management Backend tests; frontend code; frontend tests
(except the profile page integration test)

Sprint 1 carry-over: Testing End-to-end tests; regression tests

Sprint 1 carry-over: Login & Password Recovery Backend code; backend integration tests;
enhanced reset password flow

Sprint 1 Closed Sprint 1 marked Done in Notion

Infrastructure Supabase test database (habitflow-test) for the
end-to-end tests; frontend and backend tests
reorganized by feature

Testing tools Postman API test collections merged under tests/

Carried Over to Sprint 4
Everything still Blocked, To-do or In progress in Sprint 3, plus the remaining older carry-overs.

Deliverable Carried-over tasks

Task Scheduling Backend integration tests; frontend code; frontend
integration tests

Task Organization Backend integration tests; frontend code; frontend
integration tests

Testing End-to-end and regression tests for the Sprint 3
deliverables

Postman Update the API spec to match the codebase;
update the Postman files in tests/postman; get the
failing tests passing

Testing Sprint 2 end-to-end and regression tests; Sprint 3
end-to-end tests (Task Scheduling and Task
Organization) and regression tests
Sprint Retrospective

What went well?
-â€‹ The Sprint 3 Test Matrix was written first, on October 25, before any Task code.
-â€‹ Task CRUD deliverable is completely done (database, backend and frontend tasks)
-â€‹ Older carry-overs were closed. Sprint 1 and Sprint 2 carry-overs were finished in the first days of
Sprint 3.
-â€‹ Sprint 1 is now closed in Notion, which closes the Sprint 2 retrospective action.
-â€‹ The Supabase test database (habitflow-test) is ready for the end-to-end tests.
-â€‹ Postman collections are merged, and tests are now organized by feature.
-â€‹ 11 pull requests were merged, all approved and with passing checks.

What could be improved?
-â€‹ Sprint 3 is behind at the end date. Only 17 of 35 Sprint 3 tasks (48%) were Done by October 31.
The Task Scheduling and Task Organization frontends are still Ready.
-â€‹ The Postman tests fail when run. The API spec does not match the codebase, so the collections
cannot be trusted yet.
-â€‹ Sprint 2 end-to-end and regression tests are still Ready, and the Sprint 3 ones are Blocked.

What needs to be done?
-â€‹ Finish remaining tasks for Task Scheduling and Task Organization.
-â€‹ Update the API spec to match the codebase, then update tests/postman and get all Postman tests
passing.
-â€‹ Run the Sprint 2 and Sprint 3 end-to-end tests on habitflow-test, then the regression tests, as each
deliverable lands.
-â€‹ Close Sprint 2 and Sprint 3 in Notion after the regression sign-off.
-â€‹ Start Sprint 4 (Dashboard & Reporting) with the Task Management leftovers cleared first.
