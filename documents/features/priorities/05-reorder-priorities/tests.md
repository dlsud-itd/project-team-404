# Reorder Priorities Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID           | Test type      | Test file (repository-relative)                                                                          | Result | Coverage / notes                                                                                                                                                                                                                                              |
| ----------------- | -------------- | -------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRIORITIES-05-T01 | Unit           | `frontend/src/app/features/settings/priorities/priority-settings.spec.ts`                                | Pass   | drag/move controls, saved order, announcement, and rollback toast                                                                                                                                                                                             |
| PRIORITIES-05-T02 | Unit           | `frontend/src/app/features/settings/state/priorities.store.spec.ts`                                      | Pass   | immediate reorder and rollback                                                                                                                                                                                                                                |
| PRIORITIES-05-T03 | Integration    | `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`                     | Pass   | reorder request and final ordering in the Settings page                                                                                                                                                                                                       |
| PRIORITIES-05-T04 | Unit           | `backend/src/features/priorities/priority-crud/priority-crud.service.test.ts`                            | Pass   | reorder behavior                                                                                                                                                                                                                                              |
| PRIORITIES-05-T05 | Integration    | `backend/tests/integration/priorities.integration.test.ts`                                               | Fail   | persists requested order and rejects unknown/foreign or incomplete IDs; Backend integration run: 1 assertion(s) failed in this file.                                                                                                                          |
| PRIORITIES-05-T06 | API collection | `tests/postman/11-labels-priorities/Project-Team-404 API - 11-labels-priorities.postman_collection.json` | Fail   | reorders custom priorities and rejects incomplete, duplicate, or foreign IDs (requests 4 and 20 in the integration flow); Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |

## Coverage Notes

The priority route has no separate route test file in the current test inventory.
