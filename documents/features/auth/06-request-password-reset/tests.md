# Request Password Reset Tests

## Direct Coverage

### Backend Unit

- `backend/src/features/auth/forgot-password/forgot-password.service.test.ts`: invalidates old tokens, stores a hash, sends the reset link, and does not send mail for an unknown account.
- `backend/src/features/auth/forgot-password/mailer/brevo-api-mailer.test.ts`: sends through Brevo and handles provider errors.

### Frontend Integration

`frontend/tests/integration/features/auth/password-recovery.integration.spec.ts` covers request payload, email format checks/no request for invalid input, the same confirmation for known and unknown addresses, server `400`, server `500`, and network error retry behavior.

There is no separate forgot-password component unit spec in the auth component test inventory.

### Postman

`tests/postman/02-password-recovery/Project-Team-404 API - 02-password-recovery.postman_collection.json` includes request scenarios for a known account, unknown account with the same response, invalid email, and multiple requests used to verify that newer reset requests invalidate older ones. The full 24-request sequence and its manual token-copy steps are documented in `tests/postman/02-password-recovery/README.md`.

### End-to-End

`tests/e2e/auth/password-recovery.e2e.spec.ts` requests a reset link from the local console mailer and checks that unknown email addresses get the same confirmation without an email being sent.

### Regression

`frontend/src/app/features/auth/testing/regression/password-recovery.regression.spec.ts` checks that the reset request delivers the stubbed email, that unknown addresses return the same confirmation, and that requesting a second link invalidates the first.

## Security Behavior

Known and unknown email addresses intentionally receive indistinguishable success responses. Keep this assertion when changing the reset-request flow to avoid exposing account existence.
