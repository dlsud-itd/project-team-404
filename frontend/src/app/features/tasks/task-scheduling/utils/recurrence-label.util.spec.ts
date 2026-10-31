import { recurrenceLabel } from './recurrence-label.util';

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
