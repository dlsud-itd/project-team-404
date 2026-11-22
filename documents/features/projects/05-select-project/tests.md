# Select Project Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/projects/project-organization/project-switcher/project-switcher.spec.ts`: selecting a project updates `selectedProjectId` and the selected row state.
- `frontend/src/app/features/projects/shared/state/projects.store.spec.ts`: selection is stored, resolved to a project, and cleared when the store resets.

### Frontend Integration

`frontend/tests/integration/features/projects/projects.integration.spec.ts` runs the project organizer through the real route, store, and component with mocked network requests.

### End-to-End

`tests/e2e/projects/project-organization.e2e.spec.ts` switches between projects and verifies exactly one project row has `aria-current="true"` at a time.

## No API Test Layer

Project selection currently changes only frontend state; it has no backend endpoint or database write, so backend unit/integration and Postman tests do not apply. This is distinct from opening a project's task list.
