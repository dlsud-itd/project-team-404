# Delete Label Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID       | Test type      | Test file (repository-relative)                                                                          | Result | Coverage / notes                                                                                                                                                                                                                                                                            |
| ------------- | -------------- | -------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LABELS-04-T01 | Unit           | `frontend/src/app/features/settings/labels/label-settings.spec.ts`                                       | Pass   | delete confirmation, cancel, successful row removal, and failure handling                                                                                                                                                                                                                   |
| LABELS-04-T02 | Unit           | `frontend/src/app/features/settings/services/labels.service.spec.ts`                                     | Pass   | DELETE endpoint behavior                                                                                                                                                                                                                                                                    |
| LABELS-04-T03 | Integration    | `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`                     | Pass   | deletes a created label through the real settings page flow                                                                                                                                                                                                                                 |
| LABELS-04-T04 | Unit           | `backend/src/features/labels/label-crud/label-crud.service.test.ts`                                      | Pass   | 204, missing-label handling, and owner scope                                                                                                                                                                                                                                                |
| LABELS-04-T05 | Unit           | `backend/src/features/labels/label-crud/label-crud.controller.test.ts`                                   | Pass   | 204, missing-label handling, and owner scope                                                                                                                                                                                                                                                |
| LABELS-04-T06 | API collection | `tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` | Fail   | deletes an unused label and a task-attached label, verifies task survival/label-link removal, and checks the API response (requests 13, 25, and 29–32); Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |
| LABELS-04-T07 | Regression     | `tests/regression/organization/labels-priorities.regression.spec.ts`                                     | Pass   | covers label ownership and label/task association behavior                                                                                                                                                                                                                                  |

## Coverage Notes

There is no dedicated test for `delete-label.query.ts` in the label unit inventory.
