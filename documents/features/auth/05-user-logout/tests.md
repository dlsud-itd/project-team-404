# User Logout Tests

## Direct Coverage

### Frontend Integration

`frontend/tests/integration/features/auth/login.integration.spec.ts` tests logout when the backend returns `200` or `401`, and when the request fails on the network. It verifies the token/current user are cleared, navigation returns to `/login`, and later API calls do not send the old token.

`frontend/tests/integration/features/settings/settings.integration.spec.ts` also clicks the dashboard logout command while testing the settings workflow.

### Postman API Collections

- `tests/postman/03-login-session/Project-Team-404 API - 03-login-session.postman_collection.json`: requests 14–17 revoke a session, verify the first token is unusable, verify a second session remains valid, and reject a second logout using the revoked token.
- `tests/postman/04-profile/Project-Team-404 API - 04-profile.postman_collection.json`: requests 31–32 log out a separate James session and verify its token cannot access the profile.

### End-to-End

`tests/e2e/auth/login.e2e.spec.ts` checks logout from the account menu, token removal, refresh staying logged out, and browser Back not restoring the protected page.

### Regression

- `frontend/src/app/features/auth/testing/regression/login.regression.spec.ts`: logs out, verifies the server session is inactive, checks the old token gets `401`, and confirms refresh/back navigation does not restore it.
- `frontend/src/app/features/auth/testing/regression/password-recovery.regression.spec.ts` and `profile.regression.spec.ts` use logout within their broader auth journeys; logout is not their primary assertion.

## Unit Test Gaps

There is no dedicated unit test file for the top-bar logout method, `SessionService.logout()`, or the backend logout controller/service. The behavior is checked through frontend integration, Postman, E2E, and regression tests above.
