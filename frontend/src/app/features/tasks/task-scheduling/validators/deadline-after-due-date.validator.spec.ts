import { FormControl, FormGroup } from '@angular/forms';
import { deadlineAfterDueDateValidator } from './deadline-after-due-date.validator';

describe('deadlineAfterDueDateValidator', () => {
  const validate = (dueDate: string, deadline: string) =>
    deadlineAfterDueDateValidator(
      new FormGroup({ dueDate: new FormControl(dueDate), deadline: new FormControl(deadline) }),
    );

  it('rejects a deadline before the due date', () => {
    expect(validate('2026-10-02', '2026-10-01')).toEqual({ deadlineBeforeDueDate: true });
  });

  it('accepts a deadline after the due date', () => {
    expect(validate('2026-10-02', '2026-10-03')).toBeNull();
  });

  it('accepts a deadline on the due date', () => {
    expect(validate('2026-10-02', '2026-10-02')).toBeNull();
  });

  it.each([
    ['', '2026-10-01'],
    ['2026-10-02', ''],
    ['', ''],
  ])('has nothing to compare for "%s" and "%s"', (dueDate, deadline) => {
    expect(validate(dueDate, deadline)).toBeNull();
  });
});
