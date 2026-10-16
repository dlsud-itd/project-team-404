# HabitFlow

HabitFlow is a web-based habit and task tracker from Team 404. It brings tasks,
projects, deadlines, and recurring routines together so users can organize their
responsibilities and keep track of progress.

**Live preview:** [project-team-404.vercel.app](https://project-team-404.vercel.app/)

## Table of contents

- [Product goals](#product-goals)
- [Technology](#technology)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [VS Code tasks](#vs-code-tasks)
- [API](#api)
- [Deployment configuration](#deployment-configuration)
- [Project documents](#project-documents)

## Product goals

The planned core experience includes:

- Create an account and manage projects and tasks.
- Organize tasks with dates, optional deadlines, priorities, and labels.
- Set tasks to repeat daily, weekly, or monthly.
- View current, upcoming, and overdue tasks on a dashboard.

Search and filtering, notes, project favorites and archive, color customization,
streaks and statistics, alternate board or timeline views, and reminders are
potential enhancements rather than core requirements.

The current implementation is in progress. It includes account registration,
username and email availability checks, Supabase-backed user profiles, and a
default Inbox project created at sign-up.

## Technology

- **Frontend:** Angular
- **API:** Express 5 on Node.js
- **Database and authentication:** Supabase (PostgreSQL and Supabase Auth)
- **Hosting:** Vercel for the frontend; Render for the Express API

The Angular application calls the Express API. The API uses Supabase for
account and database operations. The Supabase service-role key is used only by
the backend and must never be exposed in frontend configuration.

## Repository layout

```text
frontend/    Angular application
backend/     Express API
supabase/    Database configuration, migrations, and seed data
documents/  Setup guide, requirements, API specifications, and sprint plans
testing/     End-to-end tests
```

## Getting started

Use the VS Code tasks to install dependencies, create and configure local
environment files, and start development. See the [setup guide](documents/setup.md)
for prerequisites, environment variable details, and the complete workflow.

## VS Code tasks

Open the Command Palette (`Ctrl+Shift+P`) and choose **Tasks: Run Task**, then
select a task by its label.

| Task | Purpose |
| --- | --- |
| `📦 Install All Dependencies` | Install root, frontend, and backend dependencies |
| `🛠️ Setup: Create Environment Files` | Copy the example environment files without overwriting existing ones |
| `🚀 Dev: Start All` | Start the Angular frontend and Express API |
| `✅ CI: Verify All` | Run frontend/backend tests, lint, format check, and builds |
| `🧪 Frontend: Tests (watch)` | Run frontend tests in watch mode |
| `🧪 Backend: Tests (watch)` | Run backend tests in watch mode |
| `🧪 Frontend: Tests (run once)` | Run the frontend test suite once |
| `🧪 Backend: Tests (run once)` | Run the backend test suite once |
| `🔍 Frontend: Lint` / `🔍 Backend: Lint` | Lint one application |
| `🎨 Format: Check` | Check formatting across the repository |
| `🏗️ Frontend: Build` / `🏗️ Backend: Build` | Build one application |

For the recommended first-time task order and Supabase setup, see
[documents/setup.md](documents/setup.md).

## API

The current API includes:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check API health |
| `POST` | `/api/auth/signup` | Register an account and create its Inbox |
| `GET` | `/api/auth/check-username/:username` | Check username availability |
| `GET` | `/api/auth/check-email/:email` | Check email availability |

## Deployment configuration

The frontend is deployed to Vercel and the Express API is intended to run on
Render. Configure these environment variables in the corresponding hosting
services:

- **Vercel frontend:** `NG_APP_SUPABASE_URL`,
  `NG_APP_SUPABASE_ANON_KEY`, and `NG_APP_API_BASE_URL` (the public Render API
  URL, without a trailing slash).
- **Render backend:** `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, and `CORS_ALLOWED_ORIGINS` set to the deployed
  frontend origin, `https://project-team-404.vercel.app`. Render supplies
  `PORT` automatically.

## Project documents

### Setup and planning

- [Local setup guide](documents/setup.md)
- [Project proposal](<documents/main/Team-404 - Project Proposal.pdf>)
- [Project team constitution](<documents/main/Team-404 - Project Team Constitution.pdf>)
- [Development timeline (PERT)](<documents/main/Team-404 - Timeline Development - PERT.pdf>)
- [Development timeline (Notion)](<documents/main/Team-404 - Timeline Development - Notion.pdf>)
- [Work breakdown structure (document)](<documents/main/Team-404 - WBS - Document.pdf>)
- [Work breakdown structure (diagram)](<documents/main/Team-404 - WBS - Diagram.png>)

### Requirements and design

- [User stories](<documents/main/Team-404 - User Story.pdf>)
- [Use case diagram](<documents/main/Team-404 - Use Case Diagram.pdf>)
- [UI/UX mockup](<documents/main/Team-404 - UI UX Mockup.pdf>)
- [Database schema (PDF)](<documents/main/Team-404 - Database Schema.pdf>)
- [Database schema (image)](<documents/main/Team-404 - Database Schema.png>)

### API specifications

- [Projects](<documents/main/api-spec/Team-404 - API Specification - Projects.pdf>)
- [Tasks](<documents/main/api-spec/Team-404 - API Specification - Tasks.pdf>)
- [Task scheduling](<documents/main/api-spec/Team-404 - API Specification - Tasks - Scheduling.pdf>)
- [Task organization](<documents/main/api-spec/Team-404 - API Specification - Tasks - Organization.pdf>)
- [Dashboard](<documents/main/api-spec/Team-404 - API Specification - Dashboard.pdf>)

### Sprint 1

- [Sprint 1 work breakdown structure](documents/sprints/sprint-1/Sprint_One_Work_Breakdown_Structure.md)
- [Sprint 1 timeline](documents/sprints/sprint-1/Sprint_One_PERT_Timeline.md)
- [Sprint 1 authentication API specification](<documents/sprints/sprint-1/Sprint_One_API_Specification_Authentication.pdf>)
- [Backend test matrix](documents/sprints/sprint-1/Sprint1_Backend_Test_Matrix.md)
- [Frontend test matrix](documents/sprints/sprint-1/Sprint1_Frontend_Test_Matrix.md)
