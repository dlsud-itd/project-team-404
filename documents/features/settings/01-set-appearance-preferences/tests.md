# Appearance Preferences Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/settings/preferences/preferences-settings.spec.ts`: font size/family controls, app-wide preview, save, cancel, leave-without-saving, and failed save.
- `frontend/src/app/features/settings/state/settings.store.spec.ts`: preview application, persistence/cache, and reset behavior.
- `frontend/src/app/features/settings/services/settings.service.spec.ts`: GET/PATCH settings API behavior.

### Backend Unit

There are no dedicated backend settings service/validator unit tests in the current inventory.

### Frontend Integration

`frontend/tests/integration/features/settings/settings.integration.spec.ts` exercises settings routes and API calls in the signed-in app.

### Postman

`tests/postman/14-settings/Project-Team-404 API - 14-settings.postman_collection.json` updates font size/family and rejects invalid font values, empty bodies, and unauthenticated access (requests 3 and 6–11).

### E2E and Regression

There is no dedicated appearance-preferences Playwright E2E or regression file; unit, frontend integration, and Postman coverage apply.
