# View and Update Profile Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/auth/profile/profile-settings/profile-settings.spec.ts`: loads profile values, enables save only for valid changes, and handles saved/error states.
- `frontend/src/app/features/auth/profile/services/profile.service.spec.ts`: verifies profile GET/PATCH behavior and current-user updates.
- `frontend/src/app/features/auth/profile/utils/diff-profile.util.spec.ts`: returns only changed username/timezone fields.
- `frontend/src/app/features/auth/profile/mappers/profile-error.mapper.spec.ts`: maps profile conflicts and server errors to field/form messages.

### Backend Unit

`backend/src/features/auth/profile/profile.service.test.ts` checks profile reads, missing profiles, normalized updates, and duplicate username conflicts. Shared username and timezone validator tests cover the field rules.

### Frontend Integration

There is no dedicated frontend integration spec for editing the profile fields. `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts` verifies the profile settings page is reachable from signed-in settings navigation, but its assertions focus on other settings.

### Postman

`tests/postman/04-profile/Project-Team-404 API - 04-profile.postman_collection.json` tests profile reads and updates for username/timezone, partial updates, persistence through `/me`, duplicate/empty/overlong usernames, invalid timezone, attempts to update system fields, and missing/malformed credentials. These are requests 4–20; request 33 restores the seeded profile. The 34-request order is documented in `tests/postman/04-profile/README.md`.

### End-to-End

`tests/e2e/auth/profile.e2e.spec.ts` verifies username/timezone persistence, duplicate username rejection without changing data, and login by the updated username.

### Regression

`frontend/src/app/features/auth/testing/regression/profile.regression.spec.ts` checks username changes across refresh and login, timezone-only changes, duplicate username rejection, and an expired session during save.

## Database Test Notes

There are no dedicated unit tests for `find-profile.query.ts` or `update-profile.query.ts`. Prisma behavior is exercised through backend service tests and higher-level Postman/E2E flows.
