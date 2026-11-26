# Reorder Labels Tests

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## Test Matrix

| Test ID       | Test type   | Test file (repository-relative)                                                      | Result | Coverage / notes                                                             |
| ------------- | ----------- | ------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| LABELS-05-T01 | Unit        | `frontend/src/app/features/settings/labels/label-settings.spec.ts`                   | Pass   | drag/move order, request payload, and optimistic rollback on request failure |
| LABELS-05-T02 | Unit        | `frontend/src/app/features/settings/services/labels.service.spec.ts`                 | Pass   | expects PUT /api/labels/reorder and maps returned label IDs                  |
| LABELS-05-T03 | Integration | `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts` | Pass   | mocks the expected reorder response and verifies the settings UI behavior    |
| LABELS-05-T04 | Regression  | `tests/regression/organization/labels-priorities.regression.spec.ts`                 | Pass   | tests/postman/11-labels-priorities and do not exercise label reordering      |

## Coverage Notes

The backend has no label reorder route, controller, service, query, or unit/integration test. The frontend integration suite mocks this API contract, so it does not prove a running backend can save the order.
