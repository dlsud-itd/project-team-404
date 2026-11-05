import { recurrenceLabel, recurrenceSummary, weekdayList } from './recurrence-label.util';

describe('recurrenceLabel', () => {
  it.each([
    ['daily', 'Every day'],
    ['weekly', 'Every week'],
    ['monthly', 'Every month'],
  ] as const)('names %s', (recurrence, label) => {
    expect(recurrenceLabel(recurrence)).toBe(label);
  });

  it.each([
    ['daily', 3, 'Every 3 days'],
    ['weekly', 2, 'Every 2 weeks'],
    ['monthly', 6, 'Every 6 months'],
  ] as const)('counts %s with an interval of %i', (recurrence, interval, label) => {
    expect(recurrenceLabel(recurrence, interval)).toBe(label);
  });

  it('has no label for a task that does not repeat', () => {
    expect(recurrenceLabel('none')).toBeNull();
    expect(recurrenceLabel('none', 2)).toBeNull();
  });
});

describe('weekdayList', () => {
  it('lists days in week order, Sunday first', () => {
    expect(weekdayList([5, 1, 3])).toBe('Mon, Wed and Fri');
    expect(weekdayList([6, 0])).toBe('Sun and Sat');
    expect(weekdayList([2])).toBe('Tue');
    expect(weekdayList([])).toBe('');
  });
});

describe('recurrenceSummary', () => {
  const today = new Date(2026, 10, 5);

  it('adds the weekdays to a weekly repeat', () => {
    expect(recurrenceSummary('weekly', [1, 4])).toBe('Every week on Mon and Thu');
    expect(recurrenceSummary('weekly', [])).toBe('Every week');
  });

  it('ignores weekdays for other repeats', () => {
    expect(recurrenceSummary('daily', [1, 4])).toBe('Every day');
  });

  it('adds the end date', () => {
    expect(recurrenceSummary('weekly', [5], '2026-12-18', today)).toBe(
      'Every week on Fri, until Dec 18',
    );
    expect(recurrenceSummary('monthly', [], '2027-03-01', today)).toBe(
      'Every month, until Mar 1, 2027',
    );
  });

  it('has no summary for a task that does not repeat', () => {
    expect(recurrenceSummary('none', [1], '2026-12-18')).toBeNull();
  });
});
