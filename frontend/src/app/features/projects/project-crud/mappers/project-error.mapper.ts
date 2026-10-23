import { HttpErrorResponse } from '@angular/common/http';
import type { ProjectError, ProjectField } from '../../shared/types/project.types';

const GENERIC = 'Something went wrong. Please try again.';
const NOT_FOUND = 'Project not found.';

/** Picks the form field a 400 message is about, e.g. "Project name cannot be empty" → name. */
function fieldFor(message: string): ProjectField | undefined {
  if (/description/i.test(message)) return 'description';
  if (/colou?r/i.test(message)) return 'color';
  if (/name/i.test(message)) return 'name';
  return undefined;
}

function serverMessage(error: HttpErrorResponse): string | null {
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error.trim() || null;
  }
  return null;
}

/**
 * Turns a failed /api/projects request into a message for the page. Validation errors keep the
 * server's wording, since it names the problem; everything else gets a fixed message.
 */
export function mapProjectError(error: unknown): ProjectError {
  if (!(error instanceof HttpErrorResponse)) return { message: GENERIC, notFound: false };

  switch (error.status) {
    case 400: {
      const message = serverMessage(error);
      if (!message) return { message: 'Check the project details and try again.', notFound: false };
      const field = fieldFor(message);
      return field ? { message, field, notFound: false } : { message, notFound: false };
    }
    case 401:
      return { message: 'Your session has ended. Please log in again.', notFound: false };
    case 404:
      return { message: NOT_FOUND, notFound: true };
    default:
      return { message: GENERIC, notFound: false };
  }
}
