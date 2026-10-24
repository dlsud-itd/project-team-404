import { HttpErrorResponse } from '@angular/common/http';
import { mapLoginError } from './login-error.mapper';

const httpError = (status: number) =>
  new HttpErrorResponse({ status, error: { error: 'Server message' } });

describe('mapLoginError', () => {
  it('maps 401 to one generic message and clears the password', () => {
    expect(mapLoginError(httpError(401))).toEqual({
      message: 'Incorrect email/username or password.',
      clearPassword: true,
    });
  });

  it('maps 400 to a missing-details message and keeps the password', () => {
    expect(mapLoginError(httpError(400))).toEqual({
      message: 'Enter your email or username and password.',
      clearPassword: false,
    });
  });

  it('maps server errors to a retryable message', () => {
    expect(mapLoginError(httpError(500))).toEqual({
      message: 'Something went wrong. Please try again.',
      clearPassword: false,
    });
  });

  it('maps network errors and unknown values to the retryable message', () => {
    expect(mapLoginError(httpError(0)).message).toBe('Something went wrong. Please try again.');
    expect(mapLoginError(new Error('boom')).clearPassword).toBe(false);
  });
});
