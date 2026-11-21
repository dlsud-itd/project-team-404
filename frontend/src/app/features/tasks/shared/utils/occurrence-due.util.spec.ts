import { HttpErrorResponse } from '@angular/common/http';
import { mapTaskError, notDueAvailableOn } from '../../task-crud/mappers/task-error.mapper';
import { availableOnLabel, occurrenceAvailableOn } from './occurrence-due.util';

describe('occurrenceAvailableOn', () => {
  const today = '2026-11-21';

  it('returns the day of a repeat that is not due yet', () => {
    expect(
      occurrenceAvailableOn({ isRecurring: true, done: false, occurrence: '2026-11-22' }, today),
    ).toBe('2026-11-22');
  });

  it('allows a repeat due today or earlier', () => {
    expect(
      occurrenceAvailableOn({ isRecurring: true, done: false, occurrence: today }, today),
    ).toBeNull();
    expect(
      occurrenceAvailableOn({ isRecurring: true, done: false, occurrence: '2026-11-19' }, today),
    ).toBeNull();
  });

  it('never blocks one-off tasks, done tasks, or repeats without a date', () => {
    expect(
      occurrenceAvailableOn({ isRecurring: false, done: false, occurrence: '2026-11-30' }, today),
    ).toBeNull();
    expect(
      occurrenceAvailableOn({ isRecurring: true, done: true, occurrence: '2026-11-30' }, today),
    ).toBeNull();
    expect(
      occurrenceAvailableOn({ isRecurring: true, done: false, occurrence: null }, today),
    ).toBeNull();
  });

  it('formats the day', () => {
    expect(availableOnLabel('2026-11-22')).toBe('Available on Nov 22');
  });
});

describe('task-not-due errors', () => {
  const notDue = new HttpErrorResponse({
    status: 409,
    error: { code: 'task-not-due', error: 'Not yet', availableOn: '2026-11-22' },
  });

  it('reads the day from a 409 task-not-due answer', () => {
    expect(notDueAvailableOn(notDue)).toBe('2026-11-22');
    expect(notDueAvailableOn(new HttpErrorResponse({ status: 409, error: {} }))).toBeNull();
  });

  it('explains when the repeat can be completed', () => {
    expect(mapTaskError(notDue).message).toBe(
      "This repeat isn't due yet. Available on Nov 22.",
    );
  });
});
