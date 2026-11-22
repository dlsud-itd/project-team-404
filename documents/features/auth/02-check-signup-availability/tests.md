# Signup Availability Tests

## Direct Coverage

### Frontend Unit

`frontend/src/app/features/auth/register/register.spec.ts`

- Shows checking, available, and taken states for usernames and email.
- Verifies URL encoding, lowercased email checks, and one request after the debounce settles.
- Shows a validation response from the API and does not block signup when an availability request fails.

### Frontend Integration

`frontend/tests/integration/features/auth/registration.integration.spec.ts`

- Tests availability requests through the app's real registration component, `AuthService`, and `HttpClient` with a mocked network.
- Covers encoded username/email, email case normalization, debounce behavior, and taken value messages.

### Backend Unit and Integration

- `backend/src/features/auth/register/register.controller.test.ts`, `register.service.test.ts`, and `register.integration.test.ts` cover signup submission and final uniqueness checks, but do not have a dedicated test for the two GET availability routes.
- `backend/src/features/auth/shared/validators/username.validator.test.ts` and `email.validator.test.ts` cover the shared input rules used by the availability route validators.
- There are no dedicated tests for `is-username-available.query.ts` or `is-email-available.query.ts` in the auth unit-test inventory.

### Postman

`tests/postman/01-registration/Project-Team-404 API - 01-registration.postman_collection.json` includes requests 9–14 for available/taken usernames and emails, overlong usernames, and invalid email input. The companion run guide is `tests/postman/01-registration/README.md`.

### End-to-End

`tests/e2e/auth/registration.e2e.spec.ts` checks a taken username followed by a corrected signup, an already registered email, and a successful availability-to-submit path.

### Regression

`frontend/src/app/features/auth/testing/regression/registration.regression.spec.ts` checks taken username feedback and an email becoming unavailable after its live check but before signup submission.

## Related Use

Availability is exercised as part of signup, not as a separate user action, in the frontend registration component/integration tests and the `01-registration` Postman collection. See [flowchart.md](flowchart.md) for the distinction between the preview check and the authoritative submit-time uniqueness check.
