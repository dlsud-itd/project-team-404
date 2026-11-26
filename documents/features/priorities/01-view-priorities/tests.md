# View Priorities Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID           | Test type      | Test file (repository-relative)                                                                          | Result | Coverage / notes                                                                                                                                                                                                                      |
| ----------------- | -------------- | -------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRIORITIES-01-T01 | Unit           | `frontend/src/app/features/settings/priorities/priority-settings.spec.ts`                                | Pass   | renders levels, default badge, counts, loading/error states                                                                                                                                                                           |
| PRIORITIES-01-T02 | Unit           | `frontend/src/app/features/settings/services/priorities.service.spec.ts`                                 | Pass   | GET response mapping and ordering                                                                                                                                                                                                     |
| PRIORITIES-01-T03 | Unit           | `frontend/src/app/features/settings/state/priorities.store.spec.ts`                                      | Pass   | built-in fallback, server levels, default, and reset-on-signout behavior                                                                                                                                                              |
| PRIORITIES-01-T04 | Unit           | `backend/src/features/priorities/priority-crud/priority-crud.service.test.ts`                            | Pass   | owner-scoped priority operations                                                                                                                                                                                                      |
| PRIORITIES-01-T05 | Integration    | `backend/tests/integration/priorities.integration.test.ts`                                               | Fail   | provisions separate Low/Medium/High rows per account and confirms Medium is the default; Backend integration run: 1 assertion(s) failed in this file.                                                                                 |
| PRIORITIES-01-T06 | Integration    | `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`                     | Pass   | verifies priorities load through the signed-in settings routes and feed task forms/filters                                                                                                                                            |
| PRIORITIES-01-T07 | API collection | `tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` | Fail   | starts by listing priorities, capturing IDs, and checking separate user ownership (requests 1–5); Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |

## Coverage Notes

Task CRUD, settings, and Postman suites also load priorities as setup for task creation/filtering; those assertions target the consuming feature.
