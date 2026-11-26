# Appearance Preferences Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID         | Test type      | Test file (repository-relative)                                                        | Result | Coverage / notes                                                                                                                                                                                                                                              |
| --------------- | -------------- | -------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SETTINGS-01-T01 | Unit           | `frontend/src/app/features/settings/preferences/preferences-settings.spec.ts`          | Pass   | font size/family controls, app-wide preview, save, cancel, leave-without-saving, and failed save                                                                                                                                                              |
| SETTINGS-01-T02 | Unit           | `frontend/src/app/features/settings/state/settings.store.spec.ts`                      | Pass   | preview application, persistence/cache, and reset behavior                                                                                                                                                                                                    |
| SETTINGS-01-T03 | Unit           | `frontend/src/app/features/settings/services/settings.service.spec.ts`                 | Pass   | GET/PATCH settings API behavior                                                                                                                                                                                                                               |
| SETTINGS-01-T04 | Integration    | `frontend/tests/integration/features/settings/settings.integration.spec.ts`            | Pass   | exercises settings routes and API calls in the signed-in app                                                                                                                                                                                                  |
| SETTINGS-01-T05 | API collection | `tests/postman/14-settings/Project-Team-404 API - 14-settings.postman_collection.json` | Fail   | updates font size/family and rejects invalid font values, empty bodies, and unauthenticated access (requests 3 and 6–11); Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |

## Coverage Notes

There are no dedicated backend settings service/validator unit tests in the current inventory.
There is no dedicated appearance-preferences Playwright E2E or regression file; unit, frontend integration, and Postman coverage apply.
