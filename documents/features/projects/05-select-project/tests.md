# Select Project Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID         | Test type   | Test file (repository-relative)                                                                     | Result | Coverage / notes                                                                                                                    |
| --------------- | ----------- | --------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| PROJECTS-05-T01 | Unit        | `frontend/src/app/features/projects/project-organization/project-switcher/project-switcher.spec.ts` | Pass   | selecting a project updates selectedProjectId and the selected row state                                                            |
| PROJECTS-05-T02 | Unit        | `frontend/src/app/features/projects/shared/state/projects.store.spec.ts`                            | Pass   | selection is stored, resolved to a project, and cleared when the store resets                                                       |
| PROJECTS-05-T03 | Integration | `frontend/tests/integration/features/projects/projects.integration.spec.ts`                         | Pass   | runs the project organizer through the real route, store, and component with mocked network requests                                |
| PROJECTS-05-T04 | End-to-end  | `tests/e2e/projects/project-organization.e2e.spec.ts`                                               | Fail   | switches between projects and verifies exactly one project row has aria-current="true" at a time; E2E run: 3 E2E assertions failed. |

## Coverage Notes

Project selection currently changes only frontend state; it has no backend endpoint or database write, so backend unit/integration and Postman tests do not apply. This is distinct from opening a project's task list.
