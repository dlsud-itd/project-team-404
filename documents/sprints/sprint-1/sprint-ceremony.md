           Team 404 (HabitFlow) - Sprint 1 Ceremony

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

Sprint 1 Completion Overall Project Completion

20 / 51 tasks = 39% Setup and Registration done 58 / 92 tasks = 63% Includes pre-sprint planning
and design tasks

Counts are lowest-level tasks in the Notion Gantt Chart Tasks database, as of October 16, 2026.

Sprint Planning / Progress Update

Completed in Sprint 1
Only the Setup and Registration deliverables were completed this sprint.

Deliverable Completed tasks

Setup & Backend Infrastructure Angular + Express boilerplate with .env.example;
Supabase project setup; database deployment;
GitHub checks and branch protection (dev and
main); Vercel and Render setup; root config,
scripts and VS Code tasks (ESLint, Prettier);
shared team Gmail account

Sprint 1 Documents Work Breakdown Structure; PERT Timeline;
Backend Test Matrix; Frontend Test Matrix

Web Hosting Backend and frontend deployed to a live host
(Harvey Laurence Rullan)

Registration Users and Projects table migrations; account
creation API (password hashing, input validation);
username and email availability check; default
Inbox project creation; Sign-Up UI; backend and
frontend integration tests

Carried Over to Sprint 2
Everything outside Setup and Registration was not started and moves to the next sprint.
Deliverable Carried-over tasks

Login & Session Login API; session token handling; Login UI;
session restore; logout; backend and frontend
integration tests

Password Recovery Password reset table migration; forgot password
API; reset link email; reset token validation API;
reset password API; Forgot and Reset Password
UI; backend and frontend integration tests

Profile Management Update profile API; Profile Settings UI; backend
and frontend integration tests

Testing End-to-end tests for all four deliverables
(including Registration); regression tests for all
four deliverables (including Registration);
Authentication Testing suites and test matrix
updates

Planned for Sprint 2
â—â€‹ Login & Session, Password Recovery and Profile Management, built failing-test-first as in the
Sprint 1 WBS.
â—â€‹ End-to-end and regression tests for Registration, then for each new deliverable as it lands.
â—â€‹ Revised test matrix (see Retrospective) before any new feature code is written.
â—â€‹ Task assignments will be set at the Sprint 2 planning meeting.

Sprint Retrospective

What went well?
â—â€‹ Setup was completed on schedule: repository, CI checks, branch protection, database and hosting
are all in place.

â—â€‹ Registration works across the stack (migrations, API, Sign-Up UI) with backend and frontend
integration tests.
â—â€‹ Sprint 1 WBS, PERT timeline and both test matrices were written before the code they cover.
What could be improved?
â—â€‹ One test matrix, not two. There was no need to split the matrix into separate backend and
frontend files. A single matrix is easier to maintain and review.
â—â€‹ Add a Test Type column. Label each case as unit, integration, e2e, regression or smoke.
â—â€‹ Include unit tests. The matrices covered integration, e2e and regression only. Unit tests should be
listed too.
â—â€‹ More detailed Notion tasks. Gantt chart task descriptions should have clearer instructions so any
member can pick one up.

What needs to be done?
â—â€‹ Move all work except Setup and Registration to Sprint 2: Login & Session, Password Recovery,
Profile Management and their tests.
â—â€‹ Merge the backend and frontend test matrices into one, add the Test Type column and add unit
test cases.
â—â€‹ Rewrite Notion task descriptions with step-by-step instructions and a clear definition of done.
â—â€‹ Run the Registration end-to-end and regression tests.
