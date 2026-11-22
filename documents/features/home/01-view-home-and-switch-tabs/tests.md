# Home Tabs and Dashboard Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/home/home.spec.ts`: initial dashboard tab, URL-backed tab switching, keyboard navigation, Projects panel, and dashboard/task actions.
- `frontend/src/app/features/home/dashboard.store.spec.ts`: dashboard task/project state and filtering.
- `frontend/src/app/features/home/sidebar/project-list.spec.ts`, `priority-list.spec.ts`, and `mini-calendar.spec.ts`: sidebar sections.

### Frontend Integration

Settings/Tasks/Projects integration suites exercise their panels and services. There is no separate Home integration spec beyond the Home component unit suite.

### E2E and Regression

- `tests/e2e/dashboard/current-upcoming.e2e.spec.ts` and `overdue.e2e.spec.ts`: dashboard panels through the running app.
- Auth regression `frontend/src/app/features/auth/testing/regression/registration.regression.spec.ts` verifies the signed-in user reaches `/home` after login.

### Backend/Postman

Home itself is a frontend composition; its panels call the dashboard, task, and project APIs documented under those features. No standalone Home backend or Postman suite exists.
