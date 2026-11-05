import { describe, expect, it } from 'vitest';
import type { TaskRecord } from '../../shared/models/task.model';
import { RecurrenceService } from '../services/recurrence.service';
import { getNextOccurrence } from './next-occurrence.util';

const day = (date: Date) => date.toISOString().slice(0, 10);

// 2026-11-02 is a Monday.
describe('getNextOccurrence weekly', () => {
  it('moves a week ahead when no days are chosen', () => {
    expect(day(getNextOccurrence('2026-11-02', 'weekly'))).toBe('2026-11-09');
  });

  it('moves to the next chosen weekday', () => {
    // Mon, Wed, Fri
    expect(
      day(getNextOccurrence('2026-11-02', 'weekly', 'UTC', [1, 3, 5]))
    ).toBe('2026-11-04');
    expect(
      day(getNextOccurrence('2026-11-06', 'weekly', 'UTC', [1, 3, 5]))
    ).toBe('2026-11-09');
  });

  it('moves a week ahead when only the same weekday is chosen', () => {
    expect(day(getNextOccurrence('2026-11-02', 'weekly', 'UTC', [1]))).toBe(
      '2026-11-09'
    );
  });

  it('starts on a chosen day even when the due date is not one', () => {
    // Monday due date, repeats on Sundays.
    expect(day(getNextOccurrence('2026-11-02', 'weekly', 'UTC', [0]))).toBe(
      '2026-11-08'
    );
  });
});

describe('RecurrenceService.createNextOccurrence', () => {
  const service = new RecurrenceService();
  const task = (overrides: Partial<TaskRecord>) =>
    ({
      id: 1,
      dueDate: new Date('2026-11-02T00:00:00.000Z'),
      recurrence: 'weekly',
      recurrenceDays: [1, 4],
      recurrenceEndDate: null,
      ...overrides,
    }) as TaskRecord;

  it('uses the chosen weekdays', () => {
    expect(service.createNextOccurrence(task({}))?.dueDate).toBe('2026-11-05');
  });

  it('stops once the next one would fall after the end date', () => {
    expect(
      service.createNextOccurrence(
        task({ recurrenceEndDate: new Date('2026-11-04T00:00:00.000Z') })
      )
    ).toBeNull();
  });

  it('keeps going up to and including the end date', () => {
    expect(
      service.createNextOccurrence(
        task({ recurrenceEndDate: new Date('2026-11-05T00:00:00.000Z') })
      )?.dueDate
    ).toBe('2026-11-05');
  });
});
