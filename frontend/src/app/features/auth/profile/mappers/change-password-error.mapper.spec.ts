import { HttpErrorResponse } from '@angular/common/http';
import { mapChangePasswordError } from './change-password-error.mapper';

const httpError = (status: number, error: unknown = null) =>
  new HttpErrorResponse({ status, error });

describe('mapChangePasswordError', () => {
  it('points a wrong current password at the current password field', () => {
    const body = {
      error: 'Current password is incorrect',
      details: [{ field: 'currentPassword', message: 'Current password is incorrect' }],
    };
    expect(mapChangePasswordError(httpError(400, body))).toEqual({
      message: 'Current password is incorrect',
      field: 'currentPassword',
    });
  });

  it('points a validation error at the field named in its details', () => {
    const body = {
      error: 'Invalid password details',
      details: [
        {
          field: 'newPassword',
          message: 'New password must be different from the current password',
        },
      ],
    };
    expect(mapChangePasswordError(httpError(400, body))).toEqual({
      message: 'New password must be different from the current password',
      field: 'newPassword',
    });
  });

  it('keeps the 400 message when no known field is named', () => {
    const body = { error: 'Invalid password details', details: [{ field: 'other', message: 'x' }] };
    expect(mapChangePasswordError(httpError(400, body))).toEqual({
      message: 'Invalid password details',
    });
  });

  it('falls back to a validation message when a 400 has no usable body', () => {
    for (const body of [null, 'text', { error: '' }]) {
      expect(mapChangePasswordError(httpError(400, body))).toEqual({
        message: 'Check your passwords and try again.',
      });
    }
  });

  it('maps 401 to a session message', () => {
    expect(mapChangePasswordError(httpError(401)).message).toBe(
      'Your session has ended. Please log in again.',
    );
  });

  it.each([0, 500])('maps status %s to a generic message', (status) => {
    expect(mapChangePasswordError(httpError(status))).toEqual({
      message: 'Something went wrong. Please try again.',
    });
  });

  it('maps a non-HTTP error to a generic message', () => {
    expect(mapChangePasswordError(new Error('boom'))).toEqual({
      message: 'Something went wrong. Please try again.',
    });
  });
});
