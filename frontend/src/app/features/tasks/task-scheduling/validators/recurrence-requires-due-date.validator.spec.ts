import { FormControl, FormGroup } from '@angular/forms';
import { recurrenceRequiresDueDateValidator } from './recurrence-requires-due-date.validator';

describe('recurrenceRequiresDueDateValidator', () => {
  const validate = (dueDate: string, recurrence: string) =>
    recurrenceRequiresDueDateValidator(
      new FormGroup({ dueDate: new FormControl(dueDate), recurrence: new FormControl(recurrence) }),
    );

  it.each(['daily', 'weekly', 'monthly'])('needs a due date for a %s task', (recurrence) => {
    expect(validate('', recurrence)).toEqual({ recurrenceWithoutDueDate: true });
  });

  it('accepts a repeating task with a due date', () => {
    expect(validate('2026-10-02', 'weekly')).toBeNull();
  });

  it('accepts a task that does not repeat, with or without a due date', () => {
    expect(validate('', 'none')).toBeNull();
    expect(validate('2026-10-02', 'none')).toBeNull();
  });
});
