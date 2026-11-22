# Reset Link Validation Tests

## Direct Coverage

### Backend Unit

`backend/src/features/auth/reset-password/services/validate-reset-token.service.test.ts` checks a known token, an unknown token, a token already used, and a token past its expiry.

### Frontend Integration

`frontend/tests/integration/features/auth/password-recovery.integration.spec.ts` checks encoded-token validation, that the form appears only after `{ valid: true }`, missing/invalid/expired/used token states, network failure behavior, and no validation request when the URL has no token.

There is no separate reset-page component unit spec in the auth unit test inventory.

### Postman

`tests/postman/02-password-recovery/Project-Team-404 API - 02-password-recovery.postman_collection.json` validates a seeded valid token and checks missing, unknown, expired, used, invalidated-old, still-valid-new, and freshly issued tokens. It also checks the token after a successful reset cannot be reused. See requests 1–4, 8, 11–14, 17, and 20 in the 24-request order in `tests/postman/02-password-recovery/README.md`.

### End-to-End

`tests/e2e/auth/password-recovery.e2e.spec.ts` shows the expired-link and already-used-link messages and exercises link validation before a successful password reset.

### Regression

`frontend/src/app/features/auth/testing/regression/password-recovery.regression.spec.ts` checks a consumed link, invalidation of the earlier of two links, and that only the newest link opens the reset form.

## Test Gap

There are no dedicated tests for the Prisma token lookup query or the token-status message utility; their behavior is covered through the service and higher-level integration/E2E flows.
