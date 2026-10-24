import { HttpErrorResponse } from '@angular/common/http';
import { mapProfileError } from './profile-error.mapper';

const httpError = (status: number, error: unknown = null) =>
  new HttpErrorResponse({ status, error });

describe('mapProfileError', () => {
  it('maps 409 to a taken username on the username field', () => {
    expect(mapProfileError(httpError(409, { error: 'Username is already in use' }))).toEqual({
      message: 'Username already taken.',
      field: 'username',
    });
  });

  it('points a 400 at the first field named in its details', () => {
    const body = {
      error: 'Invalid profile details',
      details: [{ field: 'timezone', message: 'Must be a valid IANA timezone' }],
    };
    expect(mapProfileError(httpError(400, body))).toEqual({
      message: 'Must be a valid IANA timezone',
      field: 'timezone',
    });
  });

  it('keeps the 400 message when the details name no known field', () => {
    const body = {
      error: 'Invalid profile details',
      details: [{ field: '', message: 'At least one profile field must be provided' }],
    };
    expect(mapProfileError(httpError(400, body))).toEqual({ message: 'Invalid profile details' });
  });

  it('falls back to a validation message when a 400 has no usable body', () => {
    for (const body of [null, 'text', { error: '' }, { error: 42 }]) {
      expect(mapProfileError(httpError(400, body))).toEqual({
        message: 'Check your profile details and try again.',
      });
    }
  });

  it('maps 401 to a session message', () => {
    expect(mapProfileError(httpError(401)).message).toBe(
      'Your session has ended. Please log in again.',
    );
  });

  it.each([0, 500, 503])('maps status %s to a generic message', (status) => {
    expect(mapProfileError(httpError(status))).toEqual({
      message: 'Something went wrong. Please try again.',
    });
  });

  it('maps a non-HTTP error to a generic message', () => {
    expect(mapProfileError(new Error('boom'))).toEqual({
      message: 'Something went wrong. Please try again.',
    });
  });
});
