# Reorder Labels Tests

## Direct Coverage

### Frontend Unit and Integration

- `frontend/src/app/features/settings/labels/label-settings.spec.ts`: drag/move order, request payload, and optimistic rollback on request failure.
- `frontend/src/app/features/settings/services/labels.service.spec.ts`: expects `PUT /api/labels/reorder` and maps returned label IDs.
- `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`: mocks the expected reorder response and verifies the settings UI behavior.

### Backend Test Gap

The backend has no label reorder route, controller, service, query, or unit/integration test. The frontend integration suite mocks this API contract, so it does not prove a running backend can save the order.

### Postman and Regression

`tests/postman/11-labels-priorities` and `tests/regression/organization/labels-priorities.regression.spec.ts` do not exercise label reordering.
