import { HttpErrorResponse } from '@angular/common/http';
import { mapTaskError } from './task-error.mapper';

const httpError = (status: number, error: unknown = null) =>
  new HttpErrorResponse({ status, error });

describe('mapTaskError', () => {
  it.each([
    ['Task title is required', 'title'],
    ['Task title cannot be empty', 'title'],
    ['Description is too long', 'description'],
    ['Invalid priority', 'priorityId'],
    ['projectId is required', 'projectId'],
    ['Task must have a due date', 'dueDate'],
    ['Invalid due date', 'dueDate'],
    ['Invalid deadline', 'deadline'],
    ['Invalid recurrence rule', 'recurrence'],
    ['Deadline cannot be earlier than due date', 'deadline'],
  ] as const)('keeps the 400 message "%s" and points at the %s field', (message, field) => {
    expect(mapTaskError(httpError(400, { error: message }))).toEqual({
      message,
      field,
      notFound: false,
    });
  });

  it('keeps a 400 message that names no field, without a field', () => {
    expect(mapTaskError(httpError(400, { error: 'Invalid request' }))).toEqual({
      message: 'Invalid request',
      notFound: false,
    });
  });

  it('falls back to a validation message when a 400 has no usable body', () => {
    for (const body of [null, 'text', { error: '' }, { error: 42 }]) {
      expect(mapTaskError(httpError(400, body))).toEqual({
        message: 'Check the task details and try again.',
        notFound: false,
      });
    }
  });

  it('maps 404 to "Task not found" and flags it', () => {
    for (const body of [{ error: 'Invalid deleting task.' }, { error: 'Task not found' }, null]) {
      expect(mapTaskError(httpError(404, body))).toEqual({
        message: 'Task not found.',
        notFound: true,
      });
    }
  });

  it('maps a 404 about the project to the project field, without flagging the task', () => {
    expect(mapTaskError(httpError(404, { error: 'Project not found' }))).toEqual({
      message: 'Project not found.',
      field: 'projectId',
      notFound: false,
    });
  });

  it('maps 401 to a session message', () => {
    expect(mapTaskError(httpError(401)).message).toBe(
      'Your session has ended. Please log in again.',
    );
  });

  it('maps server errors, network errors and unknown values to a retryable message', () => {
    for (const error of [httpError(500), httpError(0), new Error('boom'), undefined]) {
      expect(mapTaskError(error)).toEqual({
        message: 'Something went wrong. Please try again.',
        notFound: false,
      });
    }
  });
});
