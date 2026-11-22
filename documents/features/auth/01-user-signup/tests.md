# User Signup Tests

This inventory separates tests that verify signup itself from tests that only create accounts as setup for another feature.

## Direct Signup Coverage

### Frontend Unit

`frontend/src/app/features/auth/register/register.spec.ts`

- Renders the required fields and default timezone.
- Shows validation errors for empty fields, invalid email/username, short passwords, and mismatched passwords.
- Shows available/taken states; URL-encodes values, debounces requests, lowercases email checks, and handles availability request errors.
- Sends the expected signup payload, disables repeat submission, and shows the success state on `201`.
- Handles `409`, `400`, and `500` responses while preserving entered values; toggles password visibility and links to login.

### Backend Unit

- `backend/src/features/auth/register/register.controller.test.ts`: returns `201` and both the new user ID and Inbox ID.
- `backend/src/features/auth/register/register.service.test.ts`: creates Auth user, profile, and Inbox in order; rejects unavailable usernames/emails; cleans up the Auth account if profile/Inbox creation fails; surfaces cleanup failure alongside the original error.
- `backend/src/features/auth/register/validators/signup.validator.test.ts`: accepts valid signup input and rejects mismatched passwords or invalid timezones.
- `backend/src/features/auth/register/utils/normalize-email.util.test.ts`: trims and lowercases email addresses.
- `backend/src/features/auth/shared/validators/email.validator.test.ts`: normalizes valid email and rejects invalid email.
- `backend/src/features/auth/shared/validators/password.validator.test.ts`: enforces the password length rule.
- `backend/src/features/auth/shared/validators/username.validator.test.ts`: trims usernames and enforces format/length limits.
- `backend/src/features/auth/shared/validators/timezone.validator.test.ts`: accepts IANA timezones and rejects unknown zones.

### Backend Integration

`backend/src/features/auth/register/register.integration.test.ts`

- Sends a request through the Express registration router and verifies validation, creation order, `201`, and the account/Inbox IDs.
- Verifies invalid request input returns `400` without calling signup dependencies.

### Frontend Integration

`frontend/tests/integration/features/auth/registration.integration.spec.ts`

- Opens signup through the app router and exercises the real Register component, `AuthService`, and `HttpClient`; the network is mocked.
- Checks signup request fields and selected timezone, ensures the password is only in the request body and not browser storage, and displays success after `201`.
- Covers username/email availability URL encoding, debounce, case-insensitive email checks, conflicts, and validation errors.
- Confirms rejected signup stays on `/register`, stores no session, and sends no follow-up request.

`frontend/tests/integration/features/auth/login.integration.spec.ts` also verifies that a signed-in user is redirected away from `/register` by the guest route guard.

### Postman API Collection

`tests/postman/01-registration/Project-Team-404 API - 01-registration.postman_collection.json` contains 16 ordered requests. It creates a unique account, stores returned IDs, then uses them in later checks:

1. Register a new user and Inbox.
2. Duplicate seeded username returns `409`.
3. Duplicate seeded email returns `409`.
4. Password shorter than eight characters returns `400`.
5. Password confirmation mismatch returns `400`.
6. Invalid email format returns `400`.
7. Username over 50 characters returns `400`.
8. Invalid timezone returns `400`.
9. Unused username is available.
10. Seeded username is unavailable.
11. Overlong username is rejected.
12. Unused email is available.
13. Seeded email is unavailable.
14. Invalid email availability query is rejected.
15. Log in with the newly registered user.
16. Confirm the new user has exactly one default Inbox and that its ID matches signup.

The paired environment is `tests/postman/01-registration/Project-Team-404 Local (01-registration).postman_environment.json`. The run instructions and expected responses are in `tests/postman/01-registration/README.md`. The collection creates persistent test accounts; use only the isolated test project described in that guide.

### End-to-End

`tests/e2e/auth/registration.e2e.spec.ts`

- Registers, logs in, and verifies exactly one Inbox was created.
- Rejects a taken username, then allows a corrected signup.
- Rejects an already registered email.
- Rejects mismatched passwords without sending a signup request.
- Disables submit while the registration request is in flight.

### Regression

`frontend/src/app/features/auth/testing/regression/registration.regression.spec.ts`

- Signs up, logs in, restores the session after app restart, and checks `/me` returns the new user's Inbox.
- Rejects a taken username and succeeds after it is changed.
- Handles an email becoming unavailable between the live availability check and signup submit.

## Signup Used as Test Setup

These suites call the shared registration helper to create an authenticated account, but their assertions target other features rather than signup itself.

- Backend integration fixtures: `backend/tests/integration/priorities.integration.test.ts` and `backend/tests/integration/settings.integration.test.ts`, through `backend/tests/integration/helpers/supabase-test-support.ts`.
- API regression fixtures: `tests/regression/archive/archive.regression.spec.ts`, `tests/regression/organization/labels-priorities.regression.spec.ts`, `tests/regression/organization/sort-filter.regression.spec.ts`, `tests/regression/projects/project-crud.regression.spec.ts`, `tests/regression/projects/project-organization.regression.spec.ts`, `tests/regression/search/search.regression.spec.ts`, `tests/regression/settings/settings.regression.spec.ts`, `tests/regression/tasks/task-crud.regression.spec.ts`, `tests/regression/tasks/task-organization.regression.spec.ts`, and `tests/regression/tasks/task-scheduling.regression.spec.ts`.
- Postman setup: the `09-current-upcoming-tasks` and `10-overdue-tasks` collections include signup requests to provision test accounts for task scenarios. These are not signup behavior assertions.

## Persistence Test Notes

There are no dedicated unit test files for `create-user-profile.query.ts` or `create-inbox-project.query.ts`. Their effects are verified in higher-level registration integration, Postman, E2E, and regression coverage above.
