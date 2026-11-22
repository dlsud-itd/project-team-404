# Reset Password Tests

## Direct Coverage

### Frontend Integration

`frontend/tests/integration/features/auth/password-recovery.integration.spec.ts` tests the reset request body, password mismatch and invalid-password rejection, successful redirect, session cleanup, and token failure responses.

There is no standalone reset-password component unit spec in the auth component test inventory.

### Backend Unit

- `backend/src/features/auth/reset-password/services/validate-reset-token.service.test.ts` tests the token conditions used before and during reset.
- There is no dedicated `ResetPasswordService` test file or dedicated unit test for `mark-reset-token-used.query.ts` / `revoke-user-sessions.query.ts` in the auth test inventory.
- `backend/src/features/auth/shared/validators/password.validator.test.ts` tests the shared password rule used by the reset body validator.

### Postman

`tests/postman/02-password-recovery/Project-Team-404 API - 02-password-recovery.postman_collection.json` covers successful reset, replaying a used token, mismatched confirmation, a password under eight characters, an expired token, login with the new password, rejection of the old password, and revocation of a session issued before reset. These are requests 16–24 in the 24-request sequence in `tests/postman/02-password-recovery/README.md`.

### End-to-End

`tests/e2e/auth/password-recovery.e2e.spec.ts` follows a real reset link from the local mail output, changes the password, rejects the old password, accepts the new one, and rejects reuse of the link.

### Regression

`frontend/src/app/features/auth/testing/regression/password-recovery.regression.spec.ts` checks that the old session is revoked, the current browser is cleared, only the new password logs in, and the same link cannot be used twice.

## Related Setup/Restore Checks

The Postman recovery guide's final request restores James's seeded password after a successful reset. That request is cleanup for the remote test account, not a second reset-flow assertion.
