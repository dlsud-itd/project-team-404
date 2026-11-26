# Archive and Restore Label Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID       | Test type   | Test file (repository-relative)                                                      | Result | Coverage / notes                                                          |
| ------------- | ----------- | ------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------- |
| LABELS-06-T01 | Unit        | `frontend/src/app/features/settings/labels/label-settings.spec.ts`                   | Pass   | active/archive list movement, undo, restore, and request failure rollback |
| LABELS-06-T02 | Unit        | `frontend/src/app/features/settings/services/labels.service.spec.ts`                 | Pass   | archive endpoint and response mapping                                     |
| LABELS-06-T03 | Unit        | `frontend/src/app/features/archive/services/archive.service.spec.ts`                 | Pass   | restore through the combined Archive page                                 |
| LABELS-06-T04 | Unit        | `frontend/src/app/features/archive/components/archive-page/archive-page.spec.ts`     | Pass   | restore through the combined Archive page                                 |
| LABELS-06-T05 | Integration | `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts` | Pass   | label archive/restore behavior through Settings                           |
| LABELS-06-T06 | Regression  | `tests/regression/organization/labels-priorities.regression.spec.ts`                 | Pass   | covers label organization; covers shared archive behavior                 |
| LABELS-06-T07 | Regression  | `tests/regression/archive/archive.regression.spec.ts`                                | Pass   | covers label organization; covers shared archive behavior                 |

## Coverage Notes

Label archive has no separate backend unit-test file in the label inventory; route behavior is covered in Postman and regression API flows.
`tests/postman/11-labels-priorities`: label/task behavior that rejects archived labels when attaching them.
`tests/postman/15-archive`: archive and restore label requests and task attachment restrictions.
