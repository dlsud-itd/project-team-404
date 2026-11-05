import { HttpErrorResponse } from '@angular/common/http';
import type { LabelError } from '../types/label.types';

const GENERIC = 'Something went wrong. Please try again.';
export const LABEL_NOT_FOUND = 'Label not found.';
export const LABEL_NAME_TAKEN = 'You already have a label with this name.';

interface ErrorBody {
  code?: unknown;
  error?: unknown;
  details?: unknown;
}

function body(error: HttpErrorResponse): ErrorBody {
  return error.error && typeof error.error === 'object' ? (error.error as ErrorBody) : {};
}

/** The field named by a 400's `details` (from the backend's zod validation), if any. */
function detailField(details: unknown): LabelError['field'] {
  if (!Array.isArray(details)) return undefined;
  for (const detail of details) {
    const field: unknown = detail && typeof detail === 'object' ? detail.field : undefined;
    if (field === 'name' || field === 'color') return field;
  }
  return undefined;
}

/**
 * Turns a failed /api/labels request into a message for the page. A taken name (409) is shown on
 * the name field; other failures get a fixed message, since the server's wording is generic.
 */
export function mapLabelError(error: unknown): LabelError {
  if (!(error instanceof HttpErrorResponse)) return { message: GENERIC, notFound: false };

  switch (error.status) {
    case 400: {
      const field = detailField(body(error).details);
      if (field === 'name') {
        return { message: 'Use a name of 1 to 50 characters.', field, notFound: false };
      }
      if (field === 'color') {
        return { message: 'Pick one of the colors shown.', field, notFound: false };
      }
      return { message: 'Check the label details and try again.', notFound: false };
    }
    case 401:
      return { message: 'Your session has ended. Please log in again.', notFound: false };
    case 404:
      return { message: LABEL_NOT_FOUND, notFound: true };
    case 409:
      return { message: LABEL_NAME_TAKEN, field: 'name', notFound: false };
    default:
      return { message: GENERIC, notFound: false };
  }
}
