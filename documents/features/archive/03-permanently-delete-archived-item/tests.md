# Permanently Delete Archived Item Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID        | Test type      | Test file (repository-relative)                                                      | Result | Coverage / notes                                                                                                                                                                                                                                |
| -------------- | -------------- | ------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCHIVE-03-T01 | Unit           | `frontend/src/app/features/archive/components/archive-page/archive-page.spec.ts`     | Pass   | confirmation/cancel, delete success, row/count removal, and failure handling                                                                                                                                                                    |
| ARCHIVE-03-T02 | Unit           | `frontend/src/app/features/archive/services/archive.service.spec.ts`                 | Pass   | DELETE routes for tasks/projects/labels and shared-store cleanup                                                                                                                                                                                |
| ARCHIVE-03-T03 | Unit           | `frontend/src/app/features/archive/utils/archive-labels.util.spec.ts`                | Pass   | kind-specific confirmation and toast wording                                                                                                                                                                                                    |
| ARCHIVE-03-T04 | Unit           | `backend/src/features/archive/archive.service.test.ts`                               | Pass   | covers archive listing; kind-specific deletion uses the task/project/label CRUD query tests                                                                                                                                                     |
| ARCHIVE-03-T05 | API collection | `tests/postman/15-archive/Project-Team-404 API - 15-archive.postman_collection.json` | Fail   | focuses on archive, restore, paging, and auth; it does not permanently delete the seeded archived fixtures; Not executed: Newman/Postman collections were not run; their documented collection-specific setup and assertions remain unverified. |
| ARCHIVE-03-T06 | Regression     | `tests/regression/archive/archive.regression.spec.ts`                                | Pass   | covers the broader Archive workflow. Permanent deletion is also covered by CRUD Postman/E2E suites for each item type                                                                                                                           |

## Coverage Notes

Task/project deletion query tests are listed under Tasks and Projects; label deletion has no dedicated query test file.
“Permanently” means removal from the Archive interface. Tasks and projects use soft-delete records; labels are deleted outright.
