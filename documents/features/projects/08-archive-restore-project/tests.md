# Archive and Restore Project Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/projects/project-organization/project-switcher/project-switcher.spec.ts`: archive action, undo offer, and project state changes.
- `frontend/src/app/features/projects/project-organization/services/project-organization.service.spec.ts`: optimistic archive/restore and rollback.
- `frontend/src/app/features/archive/services/archive.service.spec.ts`: restore of a project from the Archive page and synchronization with `ProjectsStore`.
- `frontend/src/app/features/archive/components/archive-page/archive-page.spec.ts`: archived-item presentation and restore action.

### Backend Unit and Integration

- `backend/src/features/projects/project-organization/project-organization.service.test.ts`: archive, restore, Inbox protection, and project-not-found behavior.
- `backend/src/features/projects/project-organization/project-organization.controller.test.ts` and `project-organization.routes.test.ts`: responses and route protections.
- `backend/src/features/projects/project-organization/db/queries/set-project-archived.query.test.ts`: archive state/timestamp persistence and stale state handling.
- `backend/tests/integration/features/projects/projects.integration.test.ts`: owner-scoped archived/active project lists.

### Postman

`tests/postman/06-project-organization/Project-Team-404 API - 06-project-organization.postman_collection.json` archives a project, checks it appears only in the archived list, restores it, and rejects archiving Inbox (requests 11–15). See `tests/postman/06-project-organization/README.md`.

### End-to-End and Regression

- `tests/e2e/projects/project-organization.e2e.spec.ts`: archives and restores a project, checking the result survives reload.
- `tests/regression/projects/project-organization.regression.spec.ts`: covers owned project organization while preserving Inbox and other-user isolation.

## Cross-Feature Note

Project archive restoration is initiated from the Archive page; the API/state transition is the Projects organization operation documented in [flowchart.md](flowchart.md). The Archive feature guide should cover the shared page behavior for tasks, projects, and labels.
