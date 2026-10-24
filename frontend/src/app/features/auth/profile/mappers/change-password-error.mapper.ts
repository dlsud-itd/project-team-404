import { HttpErrorResponse } from '@angular/common/http';
import type { PasswordError, PasswordField } from '../types/profile.types';

const GENERIC = 'Something went wrong. Please try again.';
const FIELDS: readonly PasswordField[] = ['currentPassword', 'newPassword', 'confirmPassword'];

type ApiErrorBody = { error?: unknown; details?: { field?: unknown; message?: unknown }[] };

function isField(value: unknown): value is PasswordField {
  return FIELDS.includes(value as PasswordField);
}

/**
 * Turns a failed password change into a message for the form. A wrong current password comes
 * back as a 400 that names the currentPassword field, so it shows under that field.
 */
export function mapChangePasswordError(error: unknown): PasswordError {
  if (!(error instanceof HttpErrorResponse)) return { message: GENERIC };

  if (error.status === 400) {
    const body = (error.error ?? {}) as ApiErrorBody;
    const detail = Array.isArray(body.details)
      ? body.details.find((d) => isField(d.field) && typeof d.message === 'string')
      : undefined;
    if (detail) return { message: detail.message as string, field: detail.field as PasswordField };
    const message = typeof body.error === 'string' ? body.error.trim() : '';
    return { message: message || 'Check your passwords and try again.' };
  }
  if (error.status === 401) return { message: 'Your session has ended. Please log in again.' };
  return { message: GENERIC };
}
