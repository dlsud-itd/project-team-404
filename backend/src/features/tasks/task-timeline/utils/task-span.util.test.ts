import { describe, expect, it } from 'vitest';
import { getTaskSpan } from './task-span.util';

describe('getTaskSpan', () => {
  it('uses the scheduled date for the start and the deadline date for the end', () => {
    expect(
      getTaskSpan(
        {
          scheduledDate: new Date('2026-11-19T00:00:00.000Z'),
          dueDate: new Date('2026-11-20T00:00:00.000Z'),
          deadline: new Date('2026-11-22T17:00:00.000Z'),
        },
        'UTC'
      )
    ).toEqual({ start: '2026-11-19', end: '2026-11-22' });
  });

  it('uses due date as both ends when it is the only date', () => {
    expect(
      getTaskSpan(
        {
          scheduledDate: null,
          dueDate: new Date('2026-11-19T00:00:00.000Z'),
          deadline: null,
        },
        'UTC'
      )
    ).toEqual({ start: '2026-11-19', end: '2026-11-19' });
  });

  it('uses the start date as the end when no due date or deadline exists', () => {
    expect(
      getTaskSpan(
        {
          scheduledDate: new Date('2026-11-19T00:00:00.000Z'),
          dueDate: null,
          deadline: null,
        },
        'UTC'
      )
    ).toEqual({ start: '2026-11-19', end: '2026-11-19' });
  });

  it('returns no span when there is no start date', () => {
    expect(
      getTaskSpan(
        {
          scheduledDate: null,
          dueDate: null,
          deadline: new Date('2026-11-19T17:00:00.000Z'),
        },
        'UTC'
      )
    ).toBeNull();
  });

  it('uses the deadline calendar date in the requested timezone', () => {
    const task = {
      scheduledDate: new Date('2026-11-18T00:00:00.000Z'),
      dueDate: null,
      deadline: new Date('2026-11-20T01:00:00.000Z'),
    };

    expect(getTaskSpan(task, 'UTC')?.end).toBe('2026-11-20');
    expect(getTaskSpan(task, 'America/Los_Angeles')?.end).toBe('2026-11-19');
  });

  it('never ends before its start', () => {
    expect(
      getTaskSpan(
        {
          scheduledDate: new Date('2026-11-20T00:00:00.000Z'),
          dueDate: new Date('2026-11-20T00:00:00.000Z'),
          deadline: new Date('2026-11-19T17:00:00.000Z'),
        },
        'UTC'
      )
    ).toEqual({ start: '2026-11-20', end: '2026-11-20' });
  });
});
