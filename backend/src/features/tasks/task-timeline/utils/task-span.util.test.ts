import { describe, expect, it } from 'vitest';
import { getTaskSpan } from './task-span.util';

describe('getTaskSpan', () => {
  it('runs from the start date to the end date', () => {
    expect(
      getTaskSpan({
        scheduledDate: new Date('2026-11-19T00:00:00.000Z'),
        dueDate: new Date('2026-11-22T00:00:00.000Z'),
      })
    ).toEqual({ start: '2026-11-19', end: '2026-11-22' });
  });

  it('uses the end date as both ends when it is the only date', () => {
    expect(
      getTaskSpan({
        scheduledDate: null,
        dueDate: new Date('2026-11-19T00:00:00.000Z'),
      })
    ).toEqual({ start: '2026-11-19', end: '2026-11-19' });
  });

  it('uses the start date as the end when there is no end date', () => {
    expect(
      getTaskSpan({
        scheduledDate: new Date('2026-11-19T00:00:00.000Z'),
        dueDate: null,
      })
    ).toEqual({ start: '2026-11-19', end: '2026-11-19' });
  });

  it('returns no span when the task has no dates', () => {
    expect(getTaskSpan({ scheduledDate: null, dueDate: null })).toBeNull();
  });

  it('never ends before its start', () => {
    expect(
      getTaskSpan({
        scheduledDate: new Date('2026-11-20T00:00:00.000Z'),
        dueDate: new Date('2026-11-18T00:00:00.000Z'),
      })
    ).toEqual({ start: '2026-11-20', end: '2026-11-20' });
  });
});
