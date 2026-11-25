# Timeline Development PERT Estimate

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Estimation Method

The estimate applies Program Evaluation and Review Technique (PERT) to each Level 3 work package. Optimistic (`O`), most likely (`M`), and pessimistic (`P`) estimates are expressed in working days.

$$
T_e = \frac{O + 4M + P}{6}
$$

The most likely estimate receives four times the weight of either extreme, producing a realistic expected duration.

## Estimation Table

| Code | Work Package                                    |   O |   M |   P |                   $T_e$ |
| ---- | ----------------------------------------------- | --: | --: | --: | ----------------------: |
| 1.0  | Project Documentation                           | N/A | N/A | N/A |           **8.50 days** |
| 1.1  | Project Proposal                                | 2.0 | 3.0 | 5.0 |               3.25 days |
| 1.2  | WBS and Timeline                                | 1.0 | 2.0 | 3.0 |               2.00 days |
| 1.3  | User Story Document                             | 1.0 | 1.5 | 2.0 |               1.50 days |
| 1.4  | Use-Case Diagram                                | 1.0 | 1.5 | 3.0 |               1.75 days |
| 1.5  | Sprint Planning and Progress Update, per sprint | 0.5 | 1.0 | 2.0 |                1.00 day |
| 1.6  | Sprint Retrospective, per sprint                | 0.5 | 1.0 | 1.5 |                1.00 day |
| 1.7  | Stand-up Coordination, per week                 | 0.5 | 0.5 | 1.0 |                0.50 day |
| 2.0  | UI/UX Design                                    | N/A | N/A | N/A |          **13.25 days** |
| 2.1  | Low-Fidelity Wireframes                         | 2.0 | 3.0 | 5.0 |               3.25 days |
| 2.2  | High-Fidelity Mockups                           | 3.0 | 5.0 | 7.0 |               5.00 days |
| 2.3  | Style Guide                                     | 1.0 | 2.0 | 3.0 |               2.00 days |
| 2.4  | Responsive Layout Specifications                | 2.0 | 3.0 | 4.0 |               3.00 days |
| 3.0  | User Authentication                             | N/A | N/A | N/A |          **10.25 days** |
| 3.1  | Sign-Up UI                                      | 2.0 | 3.0 | 4.0 |               3.00 days |
| 3.2  | Account Creation API                            | 1.0 | 2.0 | 3.0 |               2.00 days |
| 3.3  | Login UI                                        | 1.0 | 2.0 | 3.0 |               2.00 days |
| 3.4  | Authentication API and Session Handling         | 2.0 | 3.0 | 5.0 |               3.25 days |
| 4.0  | Project Management Feature                      | N/A | N/A | N/A |           **9.75 days** |
| 4.1  | Create and Edit Project UI                      | 2.0 | 3.0 | 5.0 |               3.25 days |
| 4.2  | Project API Endpoints                           | 2.0 | 3.0 | 4.0 |               3.00 days |
| 4.3  | Project List and Switcher UI                    | 1.0 | 2.0 | 3.0 |               2.00 days |
| 4.4  | Project Data Model                              | 1.0 | 1.5 | 2.0 |               1.50 days |
| 5.0  | Task Management Feature                         | N/A | N/A | N/A |          **16.50 days** |
| 5.1  | Create, Edit, and Delete Task UI                | 3.0 | 4.0 | 6.0 |               4.25 days |
| 5.2  | Task API Endpoints                              | 2.0 | 4.0 | 6.0 |               4.00 days |
| 5.3  | Due Date and Deadline Feature                   | 1.0 | 2.0 | 3.0 |               2.00 days |
| 5.4  | Recurring Task Feature                          | 2.0 | 3.0 | 5.0 |               3.25 days |
| 5.5  | Priority Level Feature                          | 1.0 | 1.5 | 2.0 |               1.50 days |
| 5.6  | Labels and Tags Feature                         | 1.0 | 1.5 | 2.0 |               1.50 days |
| 6.0  | Dashboard and Reporting                         | N/A | N/A | N/A |           **5.25 days** |
| 6.1  | Current and Upcoming Tasks View                 | 2.0 | 3.0 | 5.0 |               3.25 days |
| 6.2  | Overdue Tasks View                              | 1.0 | 2.0 | 3.0 |               2.00 days |
| 7.0  | Optional Enhancements and Search                | N/A | N/A | N/A |    **New Sprint Scope** |
| 7.1  | Sorting and Filtering                           | 2.0 | 3.0 | 5.0 |               3.25 days |
| 7.2  | Archive and Restore                             | 2.0 | 3.0 | 4.0 |               3.00 days |
| 7.3  | Labels and Priority Management                  | 2.0 | 3.0 | 5.0 |               3.25 days |
| 7.4  | Settings and Preferences                        | 1.0 | 2.0 | 3.0 |               2.00 days |
| 7.5  | Global Search                                   | 2.0 | 3.0 | 5.0 |               3.25 days |
| 8.0  | Streaks, Views, and Reordering                  | N/A | N/A | N/A | **Recent Sprint Scope** |
| 8.1  | Streak Tracking and Streak Page                 | 2.0 | 3.0 | 5.0 |               3.25 days |
| 8.2  | List, Board, and Kanban Views                   | 2.0 | 4.0 | 6.0 |               4.00 days |
| 8.3  | Drag-and-Drop Reordering                        | 2.0 | 3.0 | 5.0 |               3.25 days |
| 8.4  | Gantt Timeline View                             | 3.0 | 5.0 | 8.0 |               5.17 days |
| 9.0  | QA, Deployment, and Presentation                | N/A | N/A | N/A |          **10.25 days** |
| 9.1  | Test Matrix                                     | 1.0 | 2.0 | 4.0 |               2.25 days |
| 9.2  | Bug and Defect Reports                          | 1.0 | 2.0 | 4.0 |               2.25 days |
| 9.3  | Hosted Web Application                          | 1.0 | 1.5 | 3.0 |               1.75 days |
| 9.4  | GitHub Repository and README                    | 0.5 | 1.0 | 2.0 |                1.00 day |
| 9.5  | Presentation Slide Deck                         | 1.0 | 2.0 | 3.0 |               2.00 days |
| 9.6  | Live Project Demo                               | 0.5 | 1.0 | 2.0 |                1.00 day |

## Summary

The original baseline estimated **84.25 person-days** for one-time work packages, excluding recurring ceremonies. Sprint 5 and newer enhancements add work for filtering, archive management, customization, search, streaks, alternative views, reordering, and timeline planning. Recurring sprint planning, retrospectives, and stand-ups are estimated per occurrence and should be added for every applicable sprint.
