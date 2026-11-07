# Work Breakdown Structure – Deliverable-Based

[Lucidspark board](https://lucid.app/lucidspark/ddfbe8a8-f1da-4edf-9057-ffbe3cc82e4c/view)

Last Updated: November 7, 2026 | Version 2.2.0

0. Task & Project Mgmt. App (root)

1. Project Documentation
   - 1.1 Planning Docs
     - 1.1.1 Project Proposal
     - 1.1.2 WBS & Timeline
   - 1.2 Requirements Docs
     - 1.2.1 User Story Document
     - 1.2.2 Use Case Diagram

2. UI/UX Design
   - 2.1 Wireframes & Mockups
     - 2.1.1 Low-Fidelity Wireframes
     - 2.1.2 High-Fidelity Mockups
   - 2.2 Design System
     - 2.2.1 Style Guide
     - 2.2.2 Responsive Layout Specs

3. User Authentication
   - 3.1 Sprint Documents
     - 3.1.1 Test Matrix (single file covering Registration, Login & Session, Password Recovery, Profile Management across backend, frontend, e2e)
     - 3.1.2 Sprint Ceremony Document
   - 3.2 Registration
     - 3.2.1 Database: Migrations (users table, projects table for Inbox)
     - 3.2.2 Database: Seeds (users, Inbox projects, seed verification and runner)
     - 3.2.3 Backend: Code (Account Creation API)
     - 3.2.4 Backend: Integration Tests (API + Supabase)
     - 3.2.5 Frontend: Code (Sign-Up UI)
     - 3.2.6 Frontend: Integration Tests (UI + services + API)
     - 3.2.7 Testing: End-to-End Tests
     - 3.2.8 Testing: Regression Tests
   - 3.3 Login & Session
     - 3.3.1 Database: Migrations (none required; uses the users table from 3.2.1)
     - 3.3.2 Database: Seeds (none required; uses the seeded accounts from 3.2.2)
     - 3.3.3 Backend: Code (Auth API & Session Handling)
     - 3.3.4 Backend: Integration Tests (API + Supabase)
     - 3.3.5 Frontend: Code (Login UI, session restore, logout)
     - 3.3.6 Frontend: Integration Tests (UI + services + API)
     - 3.3.7 Testing: End-to-End Tests
     - 3.3.8 Testing: Regression Tests
   - 3.4 Password Recovery
     - 3.4.1 Database: Migrations (password reset table)
     - 3.4.2 Database: Seeds (password reset tokens, seed verification update)
     - 3.4.3 Backend: Code (Forgot/Reset Password API, reset link email)
     - 3.4.4 Backend: Integration Tests (API + Supabase + Email)
     - 3.4.5 Frontend: Code (Forgot/Reset Password UI)
     - 3.4.6 Frontend: Integration Tests (UI + services + API)
     - 3.4.7 Testing: End-to-End Tests
     - 3.4.8 Testing: Regression Tests
   - 3.5 Profile Management
     - 3.5.1 Database: Migrations (none required; uses the users table from 3.2.1)
     - 3.5.2 Database: Seeds (none required; uses the seeded accounts from 3.2.2)
     - 3.5.3 Backend: Code (Update Profile API)
     - 3.5.4 Backend: Integration Tests (API + Supabase)
     - 3.5.5 Frontend: Code (Profile Settings UI)
     - 3.5.6 Frontend: Integration Tests (UI + services + API)
     - 3.5.7 Testing: End-to-End Tests
     - 3.5.8 Testing: Regression Tests (final full-suite run of all Sprint 1 tests; sign-off gate for the sprint)

4. Project Mgmt. Feature
   - 4.1 Sprint Documents
     - 4.1.1 Test Matrix (single file covering Project CRUD and Project Organization across backend, frontend, e2e)
     - 4.1.2 Sprint Ceremony Document
   - 4.2 Project CRUD
     - 4.2.1 Database: Migrations (add description and color to the Sprint 1 projects table with alter table)
     - 4.2.2 Database: Seeds (projects, seed verification update)
     - 4.2.3 Backend: Code (Project API Endpoints)
     - 4.2.4 Backend: Integration Tests (API + Supabase)
     - 4.2.5 Frontend: Code (Create/Edit Project UI)
     - 4.2.6 Frontend: Integration Tests (UI + services + API)
     - 4.2.7 Testing: End-to-End Tests
     - 4.2.8 Testing: Regression Tests
   - 4.3 Project Organization
     - 4.3.1 Database: Migrations (Project Data Model: add is_favorite, is_archived, sort_order)
     - 4.3.2 Database: Seeds (none required; uses the seeded projects from 4.2.2)
     - 4.3.3 Backend: Code (ordering, favorite and archive endpoints)
     - 4.3.4 Backend: Integration Tests (API + Supabase)
     - 4.3.5 Frontend: Code (Project List/Switcher UI)
     - 4.3.6 Frontend: Integration Tests (UI + services + API)
     - 4.3.7 Testing: End-to-End Tests
     - 4.3.8 Testing: Regression Tests (final full-suite run of all Sprint 1 and Sprint 2 tests; sign-off gate for the sprint)

5. Task Mgmt. Feature
   - 5.1 Sprint Documents
     - 5.1.1 Test Matrix (single file covering Task CRUD, Task Scheduling, Task Organization across backend, frontend, e2e)
     - 5.1.2 Sprint Ceremony Document
   - 5.2 Task CRUD
     - 5.2.1 Database: Migrations (tasks table)
     - 5.2.2 Database: Seeds (tasks, seed verification update)
     - 5.2.3 Backend: Code (Task API Endpoints)
     - 5.2.4 Backend: Integration Tests (API + Supabase)
     - 5.2.5 Frontend: Code (Create/Edit/Delete Task UI)
     - 5.2.6 Frontend: Integration Tests (UI + services + API)
     - 5.2.7 Testing: End-to-End Tests
     - 5.2.8 Testing: Regression Tests
   - 5.3 Task Scheduling
     - 5.3.1 Database: Migrations (due date, deadline, recurrence columns)
     - 5.3.2 Database: Seeds (scheduled tasks, seed verification update)
     - 5.3.3 Backend: Code (due date and deadline validation, recurring task handling)
     - 5.3.4 Backend: Integration Tests (API + Supabase)
     - 5.3.5 Frontend: Code (Due Date & Deadline Feature, Recurring Task Feature)
     - 5.3.6 Frontend: Integration Tests (UI + services + API)
     - 5.3.7 Testing: End-to-End Tests
     - 5.3.8 Testing: Regression Tests
   - 5.4 Task Organization
     - 5.4.1 Database: Migrations (priority column, labels table, task-label link table)
     - 5.4.2 Database: Seeds (priorities and labels, seed verification update)
     - 5.4.3 Backend: Code (priority and label endpoints)
     - 5.4.4 Backend: Integration Tests (API + Supabase)
     - 5.4.5 Frontend: Code (Priority Level Feature, Labels/Tags Feature)
     - 5.4.6 Frontend: Integration Tests (UI + services + API)
     - 5.4.7 Testing: End-to-End Tests
     - 5.4.8 Testing: Regression Tests (final full-suite run of all Sprint 1 to Sprint 3 tests; sign-off gate for the sprint)

6. Dashboard & Reporting
   - 6.1 Sprint Documents
     - 6.1.1 Test Matrix (single file covering Current & Upcoming Tasks View and Overdue Tasks View across backend, frontend, e2e)
     - 6.1.2 Sprint Ceremony Document
   - 6.2 Current & Upcoming Tasks View
     - 6.2.1 Database: Migrations (none required; uses the tasks table from 5.2.1)
     - 6.2.2 Database: Seeds (dashboard tasks, seed verification update)
     - 6.2.3 Backend: Code (current and upcoming task queries)
     - 6.2.4 Backend: Integration Tests (API + Supabase)
     - 6.2.5 Frontend: Code (Current & Upcoming Tasks View)
     - 6.2.6 Frontend: Integration Tests (UI + services + API)
     - 6.2.7 Testing: End-to-End Tests
     - 6.2.8 Testing: Regression Tests
   - 6.3 Overdue Tasks View
     - 6.3.1 Database: Migrations (none required; uses the tasks table from 5.2.1)
     - 6.3.2 Database: Seeds (none required; uses the seeded tasks from 6.2.2)
     - 6.3.3 Backend: Code (overdue task query)
     - 6.3.4 Backend: Integration Tests (API + Supabase)
     - 6.3.5 Frontend: Code (Overdue Tasks View)
     - 6.3.6 Frontend: Integration Tests (UI + services + API)
     - 6.3.7 Testing: End-to-End Tests
     - 6.3.8 Testing: Regression Tests (final full-suite run of all Sprint 1 to Sprint 4 tests; sign-off gate for the project)

7. Optional Enhancements: Filtering, Archive, Labels & Priorities, Settings & Search
   - 7.1 Sprint Documents
     - 7.1.1 Test Matrix (single file covering Sorting & Filtering, Archive, Labels & Priorities Management, Settings and Search across backend, frontend, e2e)
     - 7.1.2 API Specification Document (Filtering, Archive, Labels & Priorities, Settings & Search)
     - 7.1.3 Sprint Ceremony Document (submitted as a video recording; holiday week)
   - 7.2 Sorting & Filtering
     - 7.2.1 Database: Migrations (filter indexes on tasks, task labels and projects; no new columns)
     - 7.2.2 Database: Seeds (tasks and projects for every filter and sort, seed verification update)
     - 7.2.3 Backend: Code (extended task and project list filters and sorting)
     - 7.2.4 Backend: Integration Tests (API + Supabase)
     - 7.2.5 Frontend: Code (Filter Bar & Sort Menu, filters kept in the URL)
     - 7.2.6 Frontend: Integration Tests (UI + services + API)
     - 7.2.7 Testing: End-to-End Tests
     - 7.2.8 Testing: Regression Tests
   - 7.3 Archive
     - 7.3.1 Database: Migrations (add archived_at to the tasks, labels and projects tables; archive indexes and checks)
     - 7.3.2 Database: Seeds (archived tasks, projects and labels, seed verification update)
     - 7.3.3 Backend: Code (task and label archive endpoints, Archive list API, active-only list defaults)
     - 7.3.4 Backend: Integration Tests (API + Supabase)
     - 7.3.5 Frontend: Code (Archive actions, Archive page, read-only archived tasks)
     - 7.3.6 Frontend: Integration Tests (UI + services + API)
     - 7.3.7 Testing: End-to-End Tests
     - 7.3.8 Testing: Regression Tests
   - 7.4 Labels & Priorities Management
     - 7.4.1 Database: Migrations (per-user priority levels with color and default, label sort order)
     - 7.4.2 Database: Seeds (default and custom priorities, ordered labels, seed verification update)
     - 7.4.3 Backend: Code (Priority CRUD API, label task counts and reordering, priorityId on tasks)
     - 7.4.4 Backend: Integration Tests (API + Supabase)
     - 7.4.5 Frontend: Code (Settings layout, Settings > Labels and Settings > Priorities UI)
     - 7.4.6 Frontend: Integration Tests (UI + services + API)
     - 7.4.7 Testing: End-to-End Tests
     - 7.4.8 Testing: Regression Tests
   - 7.5 Settings: Config & Preferences
     - 7.5.1 Database: Migrations (user settings table)
     - 7.5.2 Database: Seeds (user settings, seed verification update)
     - 7.5.3 Backend: Code (Settings API, dashboard and project list limits)
     - 7.5.4 Backend: Integration Tests (API + Supabase)
     - 7.5.5 Frontend: Code (Settings > Config dashboard load limits, Settings > Preferences font size and font family, limited dashboard widgets)
     - 7.5.6 Frontend: Integration Tests (UI + services + API)
     - 7.5.7 Testing: End-to-End Tests
     - 7.5.8 Testing: Regression Tests
   - 7.6 Search
     - 7.6.1 Database: Migrations (pg_trgm extension, trigram search indexes on tasks and projects)
     - 7.6.2 Database: Seeds (search data, seed verification update)
     - 7.6.3 Backend: Code (Global Search API)
     - 7.6.4 Backend: Integration Tests (API + Supabase)
     - 7.6.5 Frontend: Code (Search Box & Results UI)
     - 7.6.6 Frontend: Integration Tests (UI + services + API)
     - 7.6.7 Testing: End-to-End Tests
     - 7.6.8 Testing: Regression Tests (final full-suite run of all Sprint 1 to Sprint 5 tests; sign-off gate for the sprint)

8. Backend Infrastructure
   - 8.1 Database
     - 8.1.1 Database Schema Design
     - 8.1.2 Database Deployment
   - 8.2 API Layer
     - 8.2.1 API Specification Doc
     - 8.2.2 API Testing

9. QA, Deployment & Presentation
   - 9.1 Deployment
     - 9.1.1 Hosted Web Application
     - 9.1.2 GitHub Repo & README
   - 9.2 Presentation
     - 9.2.1 Presentation Slide Deck
     - 9.2.2 Live Project Demo
