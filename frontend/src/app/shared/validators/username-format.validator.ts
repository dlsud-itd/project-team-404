import { ValidatorFn, Validators } from '@angular/forms';

/** Matches tbl_user.username VARCHAR(50). */
export const USERNAME_MAX_LENGTH = 50;
export const USERNAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

/**
 * Username rules shared by sign-up and profile settings: required, at most 50 characters,
 * and only letters, numbers, periods, hyphens or underscores. Reports Angular's usual
 * `required`, `maxlength` and `pattern` error keys.
 */
export const usernameFormatValidator: ValidatorFn = Validators.compose([
  Validators.required,
  Validators.maxLength(USERNAME_MAX_LENGTH),
  Validators.pattern(USERNAME_PATTERN),
])!;
