# HabitFlow

HabitFlow is a web-based habit and task tracker from Team 404. It brings tasks,
projects, start and end dates, and recurring routines together so users can organize their
responsibilities and keep track of progress.

**Live preview:** [project-team-404.vercel.app](https://project-team-404.vercel.app/)

## Table of contents

- [Product goals](#product-goals)
- [Technology](#technology)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [VS Code tasks](#vs-code-tasks)
- [App features](#app-features)
- [Deployment configuration](#deployment-configuration)
- [Project documents](#project-documents)

## Product goals

HabitFlow brings project and task management, scheduling, recurring routines,
and progress tracking together in one workspace. See [App features](#app-features)
for the current feature set.

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
documents/   Setup guide, feature specifications, and project documents
tests/       End-to-end, Postman, and regression tests
scripts/     Development, test, and database utility scripts
reports/     Generated test reports
```

## Getting started

Use the VS Code tasks to install dependencies, create and configure local
environment files, and start development. See the [setup guide](documents/setup.md)
for prerequisites, environment variable details, and the complete workflow.

### Seeded accounts

Running the Supabase seed data creates these test accounts. Their shared password
is `password123`.

| Username | Email |
| --- | --- |
| `james` | `james@example.com` |
| `harvey` | `harvey@example.com` |
| `alex` | `alex@example.com` |
| `olivia` | `olivia@example.com` |
| `ethan` | `ethan@example.com` |
| `mia` | `mia@example.com` |
| `rafael` | `rafael@example.com` |
| `grace` | `grace@example.com` |
| `felix` | `felix@example.com` |
| `amina` | `amina@example.com` |
| `priya` | `priya@example.com` |
| `kenji` | `kenji@example.com` |
| `sofia` | `sofia@example.com` |
| `ava` | `ava@example.com` |
| `noah` | `noah@example.com` |

## VS Code tasks

Open the Command Palette (`Ctrl+Shift+P`) and choose **Tasks: Run Task**, then
select a task by its label.

| Task | Purpose |
| --- | --- |
| `💻 Frontend: Dev` | Start the Angular development server |
| `🖥️ Backend: Dev` | Start the Express API in watch mode |
| `🚀 Dev: Start All` | Start frontend and backend development tasks in parallel |
| `🧪 Frontend: Tests (watch)` | Run frontend tests in watch mode |
| `🧪 Frontend: Tests (run once)` | Run the frontend test suite once |
| `🧪 Frontend: Tests (coverage report)` | Run frontend tests and generate coverage |
| `🧪 Backend: Tests (watch)` | Run backend tests in watch mode |
| `🧪 Backend: Tests (run once)` | Run backend tests once with test CORS settings |
| `🧪 Backend: Tests (coverage report)` | Run backend tests and generate coverage |
| `🧪 E2E: Tests (run once)` | Run the end-to-end test suite |
| `📊 Test Reports: Generate` | Generate backend and frontend coverage reports and collect them |
| `🧪 Regression: Tests (run once)` | Run backend, API, frontend, and regression suites; fail if a suite fails, is skipped, or is missing |
| `🔍 Frontend: Lint` | Lint the frontend |
| `🔍 Backend: Lint` | Lint the backend |
| `🔎 Backend: Typecheck` | Type-check the backend |
| `🎨 Format: Check` | Check repository formatting |
| `🎨 Format: Fix` | Format supported source and documentation files |
| `🔧 Frontend: Lint (fix)` | Apply automatic frontend lint fixes |
| `🔧 Backend: Lint (fix)` | Apply automatic backend lint fixes |
| `🏗️ Frontend: Build` | Build the frontend for production |
| `🏗️ Frontend: Build (watch)` | Rebuild the frontend on changes |
| `🏗️ Backend: Build` | Build the backend |
| `✅ CI: Verify All` | Run frontend/backend tests, lint, format check, and builds in parallel |
| `📦 Install All Dependencies` | Install root, frontend, and backend dependencies and generate the Prisma client |
| `🛠️ Setup: Create Environment Files` | Create local environment files without overwriting existing ones |
| `🧹 Clean: Build Artifacts` | Remove frontend and backend build artifacts |
| `🔐 Supabase: Login` | Authenticate the Supabase CLI |
| `🔗 Supabase: Link Project` | Link the repository to a Supabase project |
| `📤 Supabase: Push Migrations` | Apply pending migrations to the linked remote project |
| `📥 Supabase: Pull Remote State` | Pull the linked project schema into a migration (does not pull data) |
| `📊 Supabase: Check Migration Status` | List migration status for the linked project |
| `🔄 Supabase: Reset Local DB` | Destructively reset the local database and apply migrations without seed data |
| `🌱 Supabase: Seed Local DB` | Seed the running local database without resetting it |
| `🐳 Supabase: Start Local DB` | Start the local Supabase services |
| `📊 Supabase: Local Status` | Show local Supabase service status |
| `📤 Supabase: Push Local Migrations` | Apply pending migrations to the local database without resetting it |
| `⏹️ Supabase: Stop Local DB` | Stop the local Supabase services |
| `🩹 Supabase: Repair Migration History` | Mark a migration as applied or reverted in the linked project's history |
| `🌱 Supabase: Remote Seed` | Seed the linked remote database; use only with a dedicated test project |
| `⚠️ Supabase: Reset REMOTE DB (destructive)` | Destructively reset the linked remote database; use only with a disposable project |

For the recommended first-time task order and Supabase setup, see
[documents/setup.md](documents/setup.md).

## App features

Feature API details are documented in the corresponding [feature specifications](documents/features/).

| Feature | Capabilities | Specification |
| --- | --- | --- |
| Authentication and profile | Sign-up, availability checks, login, session protection, logout, password recovery, profile management, and password changes | [Authentication](documents/features/auth/api-specification.md) |
| Landing and home | Landing-page auth actions, home tabs, and task creation from Home | [Landing](documents/features/landing/api-specification.md), [Home](documents/features/home/api-specification.md) |
| Dashboard | Current and upcoming tasks, overdue tasks, and recurring-task streaks | [Dashboard](documents/features/dashboard/api-specification.md) |
| Tasks | Create, list, filter, sort, edit, delete, schedule, prioritize, label, reorder, archive, restore, and view tasks as lists, boards, timelines, and streaks | [Tasks](documents/features/tasks/api-specification.md) |
| Projects | Create, view, filter, sort, edit, delete, select, favorite, reorder, archive, and restore projects | [Projects](documents/features/projects/api-specification.md) |
| Labels and priorities | Create, view, edit, reorder, archive, restore, and delete labels and priorities; configure defaults and reassign tasks when deleting a priority | [Labels](documents/features/labels/api-specification.md), [Priorities](documents/features/priorities/api-specification.md) |
| Search | Search tasks and projects | [Search](documents/features/search/api-specification.md) |
| Settings | Configure appearance preferences and dashboard limits | [Settings](documents/features/settings/api-specification.md) |
| Archive | Browse archived items, restore them, or permanently delete them | [Archive](documents/features/archive/api-specification.md) |

## Deployment configuration

The frontend is deployed to Vercel and the Express API is intended to run on
Render. Configure these environment variables in the corresponding hosting
services:

- **Vercel frontend:** `NG_APP_SUPABASE_URL`,
  `NG_APP_SUPABASE_ANON_KEY`, and `NG_APP_API_BASE_URL` (the public Render API
  URL, without a trailing slash).
- **Render backend:** configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `WEB_APP_URL`, and `CORS_ALLOWED_ORIGINS` for `https://project-team-404.vercel.app`. Render supplies `PORT` automatically.

Password recovery emails are sent through the Brevo API. Configure
`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optionally `BREVO_SENDER_NAME` in the
backend environment. The sender email must be verified in Brevo. Keep the API
key private and only configure it on the backend.

The backend Prisma client is generated from `backend/prisma/schema` as part of
lint, typecheck, and build. Supabase SQL migrations remain the database source
of truth; do not use Prisma migrations for deployment.

## Project documents

### Setup

- [Local setup guide](documents/setup.md)

### Main project documents

- [Database schema](documents/main/database-schema.md)
- [Project proposal](documents/main/project-proposal.md)
- [Project team constitution](documents/main/project-team-constitution.md)
- [Development timeline (PERT)](documents/main/timeline-development-pert.md)
- [Development timeline (Notion)](documents/main/Timeline_Development_Notion.pdf)
- [UI/UX mockup](documents/main/UI_UX_Mockup.pdf)
- [Use case diagram](documents/main/use-case-diagram.md)
- [User stories](documents/main/user-story.md)
- [Work breakdown structure (diagram)](documents/main/wbs-diagram.md)
- [Work breakdown structure (document)](documents/main/wbs-document.md)
