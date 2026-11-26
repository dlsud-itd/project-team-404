# Dashboard Limits Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID         | Test type      | Test file (repository-relative)                                                        | Result | Coverage / notes                                                                                                                                                                                                                           |
| --------------- | -------------- | -------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SETTINGS-02-T01 | Unit           | `frontend/src/app/features/settings/config/config-settings.spec.ts`                    | Pass   | current values, step controls, min/max/whole-number validation, save, defaults, and failures                                                                                                                                               |
| SETTINGS-02-T02 | Unit           | `frontend/src/app/features/settings/state/settings.store.spec.ts`                      | Pass   | shared limit values and server updates                                                                                                                                                                                                     |
| SETTINGS-02-T03 | Unit           | `frontend/src/app/features/settings/services/settings.service.spec.ts`                 | Pass   | PATCH payload and response                                                                                                                                                                                                                 |
| SETTINGS-02-T04 | Integration    | `frontend/tests/integration/features/settings/settings.integration.spec.ts`            | Pass   | verifies protected settings routes and updates through the real settings store/service with mocked HTTP                                                                                                                                    |
| SETTINGS-02-T05 | API collection | `tests/postman/14-settings/Project-Team-404 API - 14-settings.postman_collection.json` | Fail   | patches task/project limits and rejects out-of-range limits and empty updates (requests 4–5 and 7–10); Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |

## Coverage Notes

There is no dedicated backend settings validator/service unit test file in the current inventory.
Dashboard current/upcoming and overdue widgets, plus the Home sidebar, use these saved values. Their UI-specific coverage is listed under Dashboard/Home action docs.
