import { describe, expect, it } from 'vitest';
import { toRecurrenceData } from './recurrence-data.util';

describe('toRecurrenceData', () => {
  it('writes nothing when no recurrence field is sent', () => {
    expect(toRecurrenceData({})).toEqual({});
  });

  it('stores weekly days and the end date as a date', () => {
    expect(
      toRecurrenceData({
        recurrence: 'weekly',
        recurrenceDays: [1, 3],
        recurrenceEndDate: '2026-12-31',
      })
    ).toEqual({
      recurrence: 'weekly',
      recurrenceDays: [1, 3],
      recurrenceEndDate: new Date('2026-12-31T00:00:00.000Z'),
    });
  });

  it('keeps stored days when weekly is sent without them', () => {
    expect(toRecurrenceData({ recurrence: 'weekly' })).toEqual({
      recurrence: 'weekly',
    });
  });

  it('clears the days when leaving weekly, but keeps the end date', () => {
    expect(toRecurrenceData({ recurrence: 'daily' })).toEqual({
      recurrence: 'daily',
      recurrenceDays: [],
    });
  });

  it('clears days and end date when the task stops repeating', () => {
    expect(
      toRecurrenceData({ recurrence: null, recurrenceEndDate: '2026-12-31' })
    ).toEqual({
      recurrence: 'none',
      recurrenceDays: [],
      recurrenceEndDate: null,
    });
  });
});
