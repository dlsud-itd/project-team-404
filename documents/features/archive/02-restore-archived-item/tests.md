# Restore Archived Item Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID        | Test type      | Test file (repository-relative)                                                      | Result | Coverage / notes                                                                                                                                                                                |
| -------------- | -------------- | ------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCHIVE-02-T01 | Unit           | `frontend/src/app/features/archive/components/archive-page/archive-page.spec.ts`     | Pass   | restore removes an item from the page and updates counts                                                                                                                                        |
| ARCHIVE-02-T02 | Unit           | `frontend/src/app/features/archive/services/archive.service.spec.ts`                 | Pass   | restores task/project/label state and keeps stores unchanged on request failure                                                                                                                 |
| ARCHIVE-02-T03 | Unit           | `frontend/src/app/features/archive/components/archive-action/archive-action.spec.ts` | Pass   | Undo/restore interaction                                                                                                                                                                        |
| ARCHIVE-02-T04 | Unit           | `backend/src/features/archive/archive.service.test.ts`                               | Pass   | covers listing only; per-kind restore state is tested by the owning task/project/label organization services and Postman APIs                                                                   |
| ARCHIVE-02-T05 | API collection | `tests/postman/15-archive/Project-Team-404 API - 15-archive.postman_collection.json` | Fail   | restores task, label, and project (requests 7, 10, and 13); Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |
| ARCHIVE-02-T06 | Regression     | `tests/regression/archive/archive.regression.spec.ts`                                | Pass   | covers the Archive API state changes and restored item visibility                                                                                                                               |

## Coverage Notes

No dedicated Playwright Archive suite is present; restoration has frontend unit, Postman, and regression coverage.
