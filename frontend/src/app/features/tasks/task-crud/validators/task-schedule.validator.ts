import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Checks the scheduling rules of API spec IV.A on a group with dueDate, dueTime and deadline
 * controls: a due time needs a due date, and the deadline must not be earlier than the due date.
 * Dates are YYYY-MM-DD strings, so they compare correctly as text.
 */
export const taskScheduleValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const dueDate: unknown = group.get('dueDate')?.value;
  const dueTime: unknown = group.get('dueTime')?.value;
  const deadline: unknown = group.get('deadline')?.value;

  const errors: ValidationErrors = {};
  if (dueTime && !dueDate) errors['dueTimeWithoutDate'] = true;
  if (typeof dueDate === 'string' && typeof deadline === 'string' && dueDate && deadline) {
    if (deadline < dueDate) errors['deadlineBeforeDueDate'] = true;
  }
  return Object.keys(errors).length ? errors : null;
};
