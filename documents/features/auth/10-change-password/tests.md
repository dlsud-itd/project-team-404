# Change Password Tests

## Direct Coverage

### Frontend Unit

- `frontend/src/app/features/auth/profile/change-password/change-password-form.spec.ts`: checks required inputs, password length, confirmation match, rejecting the current password as the new password, submission, and success state.
- `frontend/src/app/features/auth/profile/mappers/change-password-error.mapper.spec.ts`: maps current-password errors to the correct field.

### Backend Unit

- `backend/src/features/auth/profile/change-password.service.test.ts`: verifies the current password, updates it, keeps the requesting session, revokes other sessions, and propagates non-credential provider failures.
- `backend/src/features/auth/profile/validators/change-password.validator.test.ts`: checks required current password, minimum new password length, confirmation match, and that the new password differs from the current one.

### Frontend Integration

There is no dedicated frontend integration spec for changing a password. The workflow is exercised end-to-end and by Postman.

### Postman

`tests/postman/04-profile/Project-Team-404 API - 04-profile.postman_collection.json` tests a successful password change and session effects, caller-session validity, revocation of another session, login with the new password, rejection of the old password, wrong-current-password field details, mismatched confirmation, a short password, same-as-current rejection, and missing-token rejection. These are requests 21–30; requests 33–34 restore James's profile/password. The guide documents the complete 34-request sequence in `tests/postman/04-profile/README.md`.

`tests/postman/02-password-recovery/Project-Team-404 API - 02-password-recovery.postman_collection.json` also uses the protected password-change endpoint at the end to restore the seeded password after reset tests; that request is cleanup, not primary change-password coverage.

### End-to-End

`tests/e2e/auth/profile.e2e.spec.ts` verifies the current device remains signed in, a second device is revoked, the old password fails and the new one works, and an incorrect current password is shown as a field error.

### Regression

There is no dedicated regression scenario for the change-password action. `profile.regression.spec.ts` tests profile edits, while `password-recovery.regression.spec.ts` tests reset-password behavior; neither exercises the current-password change endpoint.
