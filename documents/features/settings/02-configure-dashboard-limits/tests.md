# Dashboard Limits Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/settings/config/config-settings.spec.ts`: current values, step controls, min/max/whole-number validation, save, defaults, and failures.
- `frontend/src/app/features/settings/state/settings.store.spec.ts`: shared limit values and server updates.
- `frontend/src/app/features/settings/services/settings.service.spec.ts`: PATCH payload and response.

### Backend Unit

There is no dedicated backend settings validator/service unit test file in the current inventory.

### Frontend Integration

`frontend/tests/integration/features/settings/settings.integration.spec.ts` verifies protected settings routes and updates through the real settings store/service with mocked HTTP.

### Postman

`tests/postman/14-settings/Project-Team-404 API - 14-settings.postman_collection.json` patches task/project limits and rejects out-of-range limits and empty updates (requests 4–5 and 7–10).

### Indirect Consumers

Dashboard current/upcoming and overdue widgets, plus the Home sidebar, use these saved values. Their UI-specific coverage is listed under Dashboard/Home action docs.
