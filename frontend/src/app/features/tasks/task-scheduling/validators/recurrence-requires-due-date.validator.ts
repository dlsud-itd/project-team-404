import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Checks a group with dueDate and recurrence controls: a repeating task needs a due date. */
export const recurrenceRequiresDueDateValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const dueDate: unknown = group.get('dueDate')?.value;
  const recurrence: unknown = group.get('recurrence')?.value;

  return recurrence !== 'none' && !dueDate ? { recurrenceWithoutDueDate: true } : null;
};
