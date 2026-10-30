import { FormControl, FormGroup } from '@angular/forms';
import { taskScheduleValidator } from './task-schedule.validator';

const validate = (dueDate: string, dueTime: string, deadline: string) =>
  taskScheduleValidator(
    new FormGroup({
      dueDate: new FormControl(dueDate),
      dueTime: new FormControl(dueTime),
      deadline: new FormControl(deadline),
    }),
  );

describe('taskScheduleValidator', () => {
  it('accepts an unscheduled task', () => {
    expect(validate('', '', '')).toBeNull();
  });

  it('accepts a due date with a time and a later deadline', () => {
    expect(validate('2026-10-02', '18:00', '2026-10-05')).toBeNull();
  });

  it('accepts a deadline on the due date', () => {
    expect(validate('2026-10-02', '', '2026-10-02')).toBeNull();
  });

  it('accepts a deadline without a due date', () => {
    expect(validate('', '', '2026-10-02')).toBeNull();
  });

  it('rejects a due time without a due date', () => {
    expect(validate('', '18:00', '')).toEqual({ dueTimeWithoutDate: true });
  });

  it('rejects a deadline before the due date', () => {
    expect(validate('2026-10-02', '', '2026-10-01')).toEqual({ deadlineBeforeDueDate: true });
  });

  it('compares dates across months and years', () => {
    expect(validate('2026-12-31', '', '2027-01-01')).toBeNull();
    expect(validate('2026-10-10', '', '2026-09-30')).toEqual({ deadlineBeforeDueDate: true });
  });
});
