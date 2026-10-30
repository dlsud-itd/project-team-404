import { HttpErrorResponse } from '@angular/common/http';
import type { ProjectError, ProjectField } from '../../shared/types/project.types';

const GENERIC = 'Something went wrong. Please try again.';
const NOT_FOUND = 'Project not found.';
const FIELDS: readonly ProjectField[] = ['name', 'description', 'color'];

/** What to show for a field the server rejected; the server's own wording is Zod's. */
const FIELD_MESSAGES: Record<ProjectField, string> = {
  name: 'Enter a project name of 150 characters or fewer.',
  description: 'Use 500 characters or fewer.',
  color: 'Pick one of the colors shown.',
};

/** Picks the form field a 400 message is about, e.g. "Project name cannot be empty" → name. */
function fieldFor(message: string): ProjectField | undefined {
  if (/description/i.test(message)) return 'description';
  if (/colou?r/i.test(message)) return 'color';
  if (/name/i.test(message)) return 'name';
  return undefined;
}

/** The first field named in a 400's `details`, e.g. [{ field: 'name', message: '...' }]. */
function detailsField(error: HttpErrorResponse): ProjectField | undefined {
  const details: unknown = (error.error as { details?: unknown } | null)?.details;
  if (!Array.isArray(details)) return undefined;
  return details
    .map((detail: { field?: unknown } | null) => detail?.field)
    .find((field): field is ProjectField => FIELDS.includes(field as ProjectField));
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
      const detail = detailsField(error);
      if (detail) return { message: FIELD_MESSAGES[detail], field: detail, notFound: false };
      const message = serverMessage(error);
      if (!message) return { message: 'Check the project details and try again.', notFound: false };
      const field = fieldFor(message);
      return field ? { message, field, notFound: false } : { message, notFound: false };
    }
    case 401:
      return { message: 'Your session has ended. Please log in again.', notFound: false };
    case 403:
      return { message: "Your Inbox is read-only, so it can't be changed.", notFound: false };
    case 404:
      return { message: NOT_FOUND, notFound: true };
    default:
      return { message: GENERIC, notFound: false };
  }
}
