import { HttpErrorResponse } from '@angular/common/http';
import type { LoginError } from '../types/login.types';

/**
 * Turns a failed login request into a message for the form. Wrong passwords and unknown
 * accounts share one message so the page never reveals which accounts exist.
 */
export function mapLoginError(error: unknown): LoginError {
  if (error instanceof HttpErrorResponse && error.status === 401) {
    return { message: 'Incorrect email/username or password.', clearPassword: true };
  }
  if (error instanceof HttpErrorResponse && error.status === 400) {
    return { message: 'Enter your email or username and password.', clearPassword: false };
  }
  return { message: 'Something went wrong. Please try again.', clearPassword: false };
}
