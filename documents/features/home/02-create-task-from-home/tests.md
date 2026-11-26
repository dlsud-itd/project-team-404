# Create Task from Home Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID     | Test type   | Test file (repository-relative)                                       | Result | Coverage / notes                                                                                                                                                                                   |
| ----------- | ----------- | --------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HOME-02-T01 | Unit        | `frontend/src/app/features/home/home.spec.ts`                         | Pass   | checks the inline All Tasks composer and opening the New Task dialog from the Tasks tab. covers quick-create form, defaults, saving, and errors                                                    |
| HOME-02-T02 | Unit        | `frontend/src/app/features/home/board/all-tasks.spec.ts`              | Pass   | checks the inline All Tasks composer and opening the New Task dialog from the Tasks tab. covers quick-create form, defaults, saving, and errors                                                    |
| HOME-02-T03 | Integration | `frontend/tests/integration/features/tasks/tasks.integration.spec.ts` | Pass   | covers the task API/form path; Home-specific creation is exercised by the Home unit suite                                                                                                          |
| HOME-02-T04 | End-to-end  | `tests/e2e/tasks/task-crud.e2e.spec.ts`                               | Fail   | No dedicated E2E or Postman case is scoped specifically to the Home inline composer. The shared POST /api/tasks API is covered by and tests/postman/07-task-crud; E2E run: 1 E2E assertion failed. |

## Coverage Notes

Task creation is implemented and tested under [Tasks](../../tasks/02-create-task/tests.md): validator, controller/service, Postman, E2E, and regression coverage. There is no separate Home backend endpoint.
