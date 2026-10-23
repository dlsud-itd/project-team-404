import { HttpErrorResponse } from '@angular/common/http';
import { mapProjectError } from './project-error.mapper';

const httpError = (status: number, error: unknown = null) =>
  new HttpErrorResponse({ status, error });

describe('mapProjectError', () => {
  it.each([
    ['Project name is required', 'name'],
    ['Project name cannot be empty', 'name'],
    ['Description must be at most 500 characters', 'description'],
    ['Invalid color format', 'color'],
  ] as const)('keeps the 400 message "%s" and points at the %s field', (message, field) => {
    expect(mapProjectError(httpError(400, { error: message }))).toEqual({
      message,
      field,
      notFound: false,
    });
  });

  it('keeps a 400 message that names no field, without a field', () => {
    expect(mapProjectError(httpError(400, { error: 'Inbox project cannot be deleted' }))).toEqual({
      message: 'Inbox project cannot be deleted',
      notFound: false,
    });
  });

  it('falls back to a validation message when a 400 has no usable body', () => {
    for (const body of [null, 'text', { error: '' }, { error: 42 }]) {
      expect(mapProjectError(httpError(400, body))).toEqual({
        message: 'Check the project details and try again.',
        notFound: false,
      });
    }
  });

  it('maps 404 to "Project not found" and flags it', () => {
    expect(mapProjectError(httpError(404, { error: 'Invalid updating project.' }))).toEqual({
      message: 'Project not found.',
      notFound: true,
    });
  });

  it('maps 401 to a session message', () => {
    expect(mapProjectError(httpError(401)).message).toBe(
      'Your session has ended. Please log in again.',
    );
  });

  it('maps server errors, network errors and unknown values to a retryable message', () => {
    for (const error of [httpError(500), httpError(0), new Error('boom'), undefined]) {
      expect(mapProjectError(error)).toEqual({
        message: 'Something went wrong. Please try again.',
        notFound: false,
      });
    }
  });
});
