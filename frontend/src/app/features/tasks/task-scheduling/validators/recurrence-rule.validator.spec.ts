import { FormControl, FormGroup } from '@angular/forms';
import { recurrenceRuleValidator } from './recurrence-rule.validator';

describe('recurrenceRuleValidator', () => {
  const validate = (
    recurrence: string,
    rule: { days?: number[]; ends?: string; endDate?: string; dueDate?: string } = {},
  ) =>
    recurrenceRuleValidator(
      new FormGroup({
        recurrence: new FormControl(recurrence),
        recurrenceDays: new FormControl(rule.days ?? []),
        recurrenceEnds: new FormControl(rule.ends ?? 'never'),
        recurrenceEndDate: new FormControl(rule.endDate ?? ''),
        dueDate: new FormControl(rule.dueDate ?? '2026-11-05'),
      }),
    );

  it('needs at least one day for a weekly repeat', () => {
    expect(validate('weekly')).toEqual({ recurrenceDaysRequired: true });
    expect(validate('weekly', { days: [1] })).toBeNull();
  });

  it('needs no days for other repeats', () => {
    expect(validate('daily')).toBeNull();
    expect(validate('monthly')).toBeNull();
  });

  it('needs an end date when the repeat ends on a date', () => {
    expect(validate('daily', { ends: 'date' })).toEqual({ recurrenceEndDateRequired: true });
    expect(validate('daily', { ends: 'date', endDate: '2026-12-31' })).toBeNull();
  });

  it('rejects an end date before the due date, but allows the due date itself', () => {
    expect(validate('daily', { ends: 'date', endDate: '2026-11-04' })).toEqual({
      recurrenceEndBeforeDueDate: true,
    });
    expect(validate('daily', { ends: 'date', endDate: '2026-11-05' })).toBeNull();
  });

  it('ignores a leftover end date when the repeat never ends', () => {
    expect(validate('daily', { ends: 'never', endDate: '2026-01-01' })).toBeNull();
  });

  it('checks nothing for a task that does not repeat', () => {
    expect(validate('none', { ends: 'date' })).toBeNull();
  });
});
