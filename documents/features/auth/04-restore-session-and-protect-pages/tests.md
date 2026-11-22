# Session Restore and Protected Page Tests

## Direct Coverage

### Frontend Unit

There is no dedicated unit spec for `auth.guards.ts`, `SessionService.restore()`, or `auth.interceptor.ts` in the auth unit-test inventory.

### Frontend Integration

`frontend/tests/integration/features/auth/login.integration.spec.ts` covers session restoration at app start, `/me` with and without a saved token, clearing a token after `/me` returns `401`, protected-route redirection for a guest, guest-route redirection for a signed-in user, and interceptor behavior for authenticated API requests.

### Postman API Collection

`tests/postman/03-login-session/Project-Team-404 API - 03-login-session.postman_collection.json` checks the current-user endpoint with valid sessions and verifies missing, malformed, tampered, and revoked credentials are rejected. Its 17-request ordering and setup are documented in `tests/postman/03-login-session/README.md`.

### End-to-End

`tests/e2e/auth/login.e2e.spec.ts` verifies a session is restored after reload and that invalid tokens/protected routes redirect to login and clear the token.

### Regression

- `frontend/src/app/features/auth/testing/regression/registration.regression.spec.ts`: restarts the app after signup/login, checks `/me` returns the new user's Inbox, and verifies the signed-in route remains accessible.
- `frontend/src/app/features/auth/testing/regression/login.regression.spec.ts`: restores a logged-in user after restart and verifies server-revoked sessions lead back to login.

## Used by Other Integration Suites

Frontend settings integration suites also initialize a stored session to reach protected settings routes: `frontend/tests/integration/features/settings/settings.integration.spec.ts` and `frontend/tests/integration/features/settings/labels-priorities.integration.spec.ts`. Their primary assertions cover settings, not session restoration itself.
