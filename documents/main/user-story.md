# HabitFlow User Stories

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Account and Access

| ID    | As a ...        | I want to ...                                | So that ...                               | Priority |
| ----- | --------------- | -------------------------------------------- | ----------------------------------------- | -------- |
| US-01 | New user        | Create an account with validated credentials | I can securely use HabitFlow              | Must     |
| US-02 | Registered user | Sign in, restore my session, and sign out    | I can access only my projects and tasks   | Must     |
| US-03 | Registered user | Recover or reset a forgotten password        | I can regain access to my account         | Should   |
| US-04 | Registered user | Update my profile and account settings       | I can keep my account information current | Should   |

## Projects

| ID    | As a ... | I want to ...                                                    | So that ...                                               | Priority |
| ----- | -------- | ---------------------------------------------------------------- | --------------------------------------------------------- | -------- |
| US-10 | User     | Create a project with a name, description, and color             | I can organize tasks around an activity or responsibility | Must     |
| US-11 | User     | Edit, archive, restore, reorder, or permanently remove a project | I can keep my project list accurate and organized         | Must     |
| US-12 | User     | Mark a project as a favorite                                     | I can quickly identify frequently used projects           | Should   |
| US-13 | User     | Switch between projects or the Inbox                             | I can focus on the work that belongs to a specific area   | Must     |

## Tasks

| ID    | As a ... | I want to ...                                      | So that ...                                                | Priority |
| ----- | -------- | -------------------------------------------------- | ---------------------------------------------------------- | -------- |
| US-20 | User     | Create, edit, complete, and delete tasks           | I can maintain an accurate task list                       | Must     |
| US-21 | User     | Set scheduled dates, due dates, and deadlines      | I can distinguish when work should start and finish        | Must     |
| US-22 | User     | Configure daily, weekly, or monthly recurrence     | I can maintain repeating routines without recreating tasks | Must     |
| US-23 | User     | Assign or change a priority                        | I can identify the work that needs attention first         | Must     |
| US-24 | User     | Create labels and attach multiple labels to a task | I can categorize and filter work across projects           | Must     |
| US-25 | User     | Archive, restore, or permanently remove a task     | I can separate inactive work without losing it by accident | Should   |
| US-26 | User     | Reorder tasks by drag and drop                     | I can express personal task order and importance           | Should   |

## Views and Planning

| ID    | As a ... | I want to ...                                              | So that ...                                             | Priority |
| ----- | -------- | ---------------------------------------------------------- | ------------------------------------------------------- | -------- |
| US-30 | User     | View current, upcoming, and overdue tasks on the dashboard | I can monitor responsibilities at a glance              | Must     |
| US-31 | User     | Switch between list, board, and timeline views             | I can choose the most useful representation for my work | Should   |
| US-32 | User     | Inspect tasks on a Gantt-style timeline                    | I can understand schedules and date overlap             | Should   |
| US-33 | User     | Drag timeline dates to reschedule tasks                    | I can make date changes visually                        | Could    |
| US-34 | User     | Use a Kanban board for project tasks                       | I can organize work by status or workflow               | Should   |

## Search, Filtering, and Personalization

| ID    | As a ... | I want to ...                                              | So that ...                                                   | Priority |
| ----- | -------- | ---------------------------------------------------------- | ------------------------------------------------------------- | -------- |
| US-40 | User     | Search tasks and projects globally                         | I can find work quickly                                       | Must     |
| US-41 | User     | Filter tasks by project, priority, label, status, and date | I can narrow my view to relevant work                         | Must     |
| US-42 | User     | Sort tasks and keep filter choices in the URL              | I can repeat or share a useful view                           | Should   |
| US-43 | User     | Customize labels and priority levels                       | I can align organization with my workflow                     | Should   |
| US-44 | User     | Configure dashboard limits and font preferences            | I can make the interface comfortable and useful               | Should   |
| US-45 | User     | Choose a light or dark theme                               | I can use HabitFlow in my preferred visual mode               | Should   |
| US-46 | User     | View an archive of inactive tasks, projects, and labels    | I can recover or review items without cluttering active views | Should   |

## Habits and Progress

| ID    | As a ... | I want to ...                               | So that ...                                           | Priority |
| ----- | -------- | ------------------------------------------- | ----------------------------------------------------- | -------- |
| US-50 | User     | Track streaks for recurring tasks           | I can see consistency and sustained progress          | Should   |
| US-51 | User     | View current and longest streak information | I can stay motivated and understand my habit history  | Should   |
| US-52 | User     | Open a dedicated streak view                | I can review all recurring-task progress in one place | Should   |

## Acceptance Notes

- All user and project data must remain scoped to the authenticated account.
- Archived, deleted, and inactive items must follow explicit restore or permanent-delete behavior.
- List, board, and timeline views must remain synchronized with the same task data.
- Mobile and desktop layouts must provide the same core task-management workflows.
