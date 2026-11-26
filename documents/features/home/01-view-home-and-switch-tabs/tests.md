# Home Tabs and Dashboard Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID     | Test type  | Test file (repository-relative)                                                     | Result | Coverage / notes                                                                                                                   |
| ----------- | ---------- | ----------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| HOME-01-T01 | Unit       | `frontend/src/app/features/home/home.spec.ts`                                       | Pass   | initial dashboard tab, URL-backed tab switching, keyboard navigation, Projects panel, and dashboard/task actions                   |
| HOME-01-T02 | Unit       | `frontend/src/app/features/home/dashboard.store.spec.ts`                            | Pass   | dashboard task/project state and filtering                                                                                         |
| HOME-01-T03 | Unit       | `frontend/src/app/features/home/sidebar/project-list.spec.ts`                       | Pass   | sidebar sections                                                                                                                   |
| HOME-01-T04 | Unit       | `frontend/src/app/features/home/sidebar/priority-list.spec.ts`                      | Pass   | sidebar sections                                                                                                                   |
| HOME-01-T05 | Unit       | `frontend/src/app/features/home/sidebar/mini-calendar.spec.ts`                      | Pass   | sidebar sections                                                                                                                   |
| HOME-01-T06 | End-to-end | `tests/e2e/dashboard/current-upcoming.e2e.spec.ts`                                  | Fail   | dashboard panels through the running app; E2E run: dashboard fixture is 98 hours old; suite requires a seed younger than 24 hours. |
| HOME-01-T07 | End-to-end | `tests/e2e/dashboard/overdue.e2e.spec.ts`                                           | Fail   | dashboard panels through the running app; E2E run: dashboard fixture is 98 hours old; suite requires a seed younger than 24 hours. |
| HOME-01-T08 | Regression | `frontend/src/app/features/auth/testing/regression/registration.regression.spec.ts` | Pass   | Auth regression verifies the signed-in user reaches /home after login                                                              |

## Coverage Notes

Settings/Tasks/Projects integration suites exercise their panels and services. There is no separate Home integration spec beyond the Home component unit suite.
Home itself is a frontend composition; its panels call the dashboard, task, and project APIs documented under those features. No standalone Home backend or Postman suite exists.
