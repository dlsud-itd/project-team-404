import { HttpErrorResponse } from '@angular/common/http';
import type { TaskError, TaskField } from '../../shared/types/task.types';
import { availableOnLabel } from '../../shared/utils/occurrence-due.util';

const GENERIC = 'Something went wrong. Please try again.';
const NOT_FOUND = 'Task not found.';

/**
 * Picks the form field a 400 message is about, e.g. "Task title cannot be empty" → title.
 * Deadline goes first: "Deadline cannot be earlier than due date" is about the deadline.
 */
function fieldFor(message: string): TaskField | undefined {
  if (/deadline/i.test(message)) return 'deadline';
  if (/scheduled/i.test(message)) return 'scheduledDate';
  if (/recurrence/i.test(message)) return 'recurrence';
  // A whole word, so "Invalid task update" is not taken for a date.
  if (/\bdate\b/i.test(message)) return 'dueDate';
  if (/priority/i.test(message)) return 'priorityId';
  if (/project/i.test(message)) return 'projectId';
  if (/description/i.test(message)) return 'description';
  if (/title/i.test(message)) return 'title';
  return undefined;
}

function serverMessage(error: HttpErrorResponse): string | null {
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error.trim() || null;
  }
  return null;
}

/** The day from a 409 `task-not-due` answer, or null for any other error. */
export function notDueAvailableOn(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
  const body: unknown = error.error;
  if (
    body &&
    typeof body === 'object' &&
    'code' in body &&
    body.code === 'task-not-due' &&
    'availableOn' in body &&
    typeof body.availableOn === 'string'
  ) {
    return body.availableOn;
  }
  return null;
}

/**
 * Turns a failed /api/tasks request into a message for the page. Validation errors keep the
 * server's wording, since it names the problem; everything else gets a fixed message.
 */
export function mapTaskError(error: unknown): TaskError {
  if (!(error instanceof HttpErrorResponse)) return { message: GENERIC, notFound: false };

  switch (error.status) {
    case 400: {
      const message = serverMessage(error);
      if (!message) return { message: 'Check the task details and try again.', notFound: false };
      const field = fieldFor(message);
      return field ? { message, field, notFound: false } : { message, notFound: false };
    }
    case 401:
      return { message: 'Your session has ended. Please log in again.', notFound: false };
    case 409: {
      const available = notDueAvailableOn(error);
      if (available) {
        return {
          message: `This repeat isn't due yet. ${availableOnLabel(available)}.`,
          notFound: false,
        };
      }
      return { message: GENERIC, notFound: false };
    }
    case 404:
      // A 404 naming a project means the target project is gone, not the task.
      if (/project/i.test(serverMessage(error) ?? '')) {
        return { message: 'Project not found.', field: 'projectId', notFound: false };
      }
      return { message: NOT_FOUND, notFound: true };
    default:
      return { message: GENERIC, notFound: false };
  }
}
