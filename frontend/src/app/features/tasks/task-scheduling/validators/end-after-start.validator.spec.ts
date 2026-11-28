import { FormControl, FormGroup } from '@angular/forms';
import { endAfterStartValidator } from './end-after-start.validator';

describe('endAfterStartValidator', () => {
  const validate = (scheduledDate: string, dueDate: string) =>
    endAfterStartValidator(
      new FormGroup({
        scheduledDate: new FormControl(scheduledDate),
        dueDate: new FormControl(dueDate),
      }),
    );

  it('rejects an end date before the start date', () => {
    expect(validate('2026-10-02', '2026-10-01')).toEqual({ endBeforeStart: true });
  });

  it('accepts an end date after the start date', () => {
    expect(validate('2026-10-02', '2026-10-03')).toBeNull();
  });

  it('accepts a one-day task that starts and ends on the same date', () => {
    expect(validate('2026-10-02', '2026-10-02')).toBeNull();
  });

  it.each([
    ['', '2026-10-01'],
    ['2026-10-02', ''],
    ['', ''],
  ])('has nothing to compare for "%s" and "%s"', (scheduledDate, dueDate) => {
    expect(validate(scheduledDate, dueDate)).toBeNull();
  });
});
