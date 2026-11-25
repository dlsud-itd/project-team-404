# HabitFlow Project Proposal

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## 1. Problem Statement

People often struggle to remain consistent with daily responsibilities because tasks, deadlines, and recurring routines can be difficult to manage. Traditional task lists help users record work, but they may not clearly show progress, priority, recurrence, or overdue obligations.

HabitFlow combines task management with habit-building support in one application. It gives users a clear structure for organizing work, planning dates, tracking recurring behavior, and reviewing progress.

## 2. General Objective

Develop a web-based habit and task tracker that helps users organize projects and tasks, manage deadlines, build recurring routines, and monitor their progress.

## 3. Specific Objectives

- Allow users to create and manage projects and tasks.
- Let users assign scheduled dates, due dates, deadlines, priorities, labels, and recurrence.
- Display current, upcoming, overdue, recurring, and completed work.
- Support list, board, Kanban, and Gantt-style timeline views.
- Provide filtering, sorting, global search, archive, restore, and drag-and-drop organization.
- Track streak progress and encourage consistent completion of recurring tasks.
- Allow users to customize labels, priorities, font, theme, dashboard limits, and displayed widgets.

## 4. Proposed Solution

HabitFlow is a responsive Angular and TypeScript application backed by a REST API and a structured database. Each authenticated account manages its own projects, tasks, labels, priorities, preferences, and archived items.

Users can organize work in an Inbox or named projects, attach labels and priorities, schedule recurring tasks, and review work through the dashboard or alternate task views. Search and filtering help users narrow large lists, while archive and restore actions keep inactive items available without cluttering active views.

## 5. Core Features

| Area            | Included Features                                                                          |
| --------------- | ------------------------------------------------------------------------------------------ |
| Account         | Registration, login, session handling, password recovery, profile management, and sign out |
| Projects        | Project CRUD, descriptions, colors, favorites, ordering, archiving, and restoration        |
| Tasks           | Task CRUD, completion, scheduled dates, due dates, deadlines, and recurrence               |
| Organization    | Custom priorities, labels, task-label assignments, and drag-and-drop reordering            |
| Dashboard       | Current, upcoming, overdue, completed, and streak-oriented views                           |
| Views           | List, Kanban board, and Gantt-style timeline views                                         |
| Discovery       | Global search, filtering, sorting, and URL-persisted task filters                          |
| Personalization | Theme selection, font size and family preferences, dashboard limits, and widget settings   |
| Archive         | Archived task, project, and label pages with restore and permanent-delete operations       |

## 6. Technology and Delivery

- **Frontend:** Angular, TypeScript, and responsive browser interfaces
- **Backend:** Node.js REST API with authentication and user-scoped authorization
- **Database:** PostgreSQL through Supabase
- **Testing:** Unit, integration, end-to-end, and regression test suites
- **Deployment:** Hosted frontend and backend with repository documentation

## 7. Recent Implemented Enhancements

- Streak tracking for recurring tasks and a dedicated streak view
- Drag-and-drop task reordering
- Home Tasks tab and Kanban board view
- Global search across tasks and projects
- Archive workflows for tasks, projects, and labels
- Light and dark theme preferences
- Configurable dashboard limits and font preferences
- Gantt-style timeline with zoom, date bars, and timeline layout controls

## 8. Target Users

HabitFlow is intended for students, professionals, and individuals who want to manage daily tasks and habits in one accessible workspace.

## 9. References

### Todoist

- [Features](https://www.todoist.com/features)
- [Introduction to Projects](https://www.todoist.com/help/articles/introduction-to-projects-TLTjNftLM)
- [Introduction to Deadlines](https://www.todoist.com/help/articles/introduction-to-deadlines-in-todoist-uMqbSLM6U)
- [Introduction to Recurring Dates](https://www.todoist.com/help/articles/introduction-to-recurring-dates-YUYVJJAV)

### Atomic Habits

- [Official Book Page](https://jamesclear.com/atomic-habits)
- [Four Laws of Behavior Change](https://jamesclear.com/atomic-habits-summary)

### Atoms

- [Atoms Application](https://atoms.jamesclear.com/)
