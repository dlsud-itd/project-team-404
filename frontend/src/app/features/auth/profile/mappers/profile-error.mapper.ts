import { HttpErrorResponse } from '@angular/common/http';
import type { ProfileError, ProfileField } from '../types/profile.types';

const GENERIC = 'Something went wrong. Please try again.';
const FIELDS: readonly ProfileField[] = ['username', 'timezone'];

type ApiErrorBody = { error?: unknown; details?: { field?: unknown; message?: unknown }[] };

function isField(value: unknown): value is ProfileField {
  return FIELDS.includes(value as ProfileField);
}

/**
 * Turns a failed /api/auth/profile request into a message for the form. A 409 means the
 * username is taken; a 400 points at the first field the server rejected when it says which.
 */
export function mapProfileError(error: unknown): ProfileError {
  if (!(error instanceof HttpErrorResponse)) return { message: GENERIC };

  switch (error.status) {
    case 409:
      return { message: 'Username already taken.', field: 'username' };
    case 400: {
      const body = (error.error ?? {}) as ApiErrorBody;
      const detail = Array.isArray(body.details)
        ? body.details.find((d) => isField(d.field) && typeof d.message === 'string')
        : undefined;
      if (detail) return { message: detail.message as string, field: detail.field as ProfileField };
      const message = typeof body.error === 'string' ? body.error.trim() : '';
      return { message: message || 'Check your profile details and try again.' };
    }
    case 401:
      return { message: 'Your session has ended. Please log in again.' };
    default:
      return { message: GENERIC };
  }
}
