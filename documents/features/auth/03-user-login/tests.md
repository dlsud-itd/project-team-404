# User Login Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/auth/login/login.spec.ts`: validates fields, submits login, navigates after success, and shows errors.
- `frontend/src/app/features/auth/login/services/login.service.spec.ts`: verifies the login request and token storage behavior.
- `frontend/src/app/features/auth/login/mappers/login-error.mapper.spec.ts`: maps backend failures to user-facing login messages.

### Backend Unit

There are no dedicated backend login service/controller test files in `backend/src/features/auth/login`. Login behavior is covered by the running-app E2E tests, the login/session Postman collection, and the frontend regression harness.

### Frontend Integration

`frontend/tests/integration/features/auth/login.integration.spec.ts` exercises the real login UI, `SessionService`, `LoginService`, token storage, and interceptor with a mocked HTTP network. It covers successful login, empty input, generic wrong-password behavior, token persistence, and keeping passwords out of URLs/storage.

### Postman API Collections

- `tests/postman/03-login-session/Project-Team-404 API - 03-login-session.postman_collection.json`: 17 ordered requests cover email, username, and mixed-case email login; user response; wrong password versus unknown identifier; missing/invalid fields; missing/malformed/tampered tokens; and session/logout checks. The guide is `tests/postman/03-login-session/README.md`.
- `tests/postman/01-registration/Project-Team-404 API - 01-registration.postman_collection.json`: request 15 logs in with the account just created by signup.
- `tests/postman/04-profile/Project-Team-404 API - 04-profile.postman_collection.json`: initial login setup plus successful new-password and rejected old-password login checks.

### End-to-End

`tests/e2e/auth/login.e2e.spec.ts` checks username login, a generic wrong-password message, remembered session behavior across reload, and login-page routing around logout/protected routes.

### Regression

`frontend/src/app/features/auth/testing/regression/login.regression.spec.ts` checks email and username login, wrong-password feedback followed by successful retry, and behavior after a server-revoked session.

## Login Used as Test Setup

Other auth regressions and profile/password-recovery E2E flows sign in users before testing their primary action. Many task, project, search, archive, settings, and organization test suites also log in seeded or helper-created users; those assertions target their own feature rather than login itself.
