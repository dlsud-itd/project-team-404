import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Checks a group with recurrence, recurrenceDays, recurrenceEnds, recurrenceEndDate and dueDate
 * controls: a weekly repeat needs at least one weekday, and a repeat that ends on a date needs
 * that date, no earlier than the due date.
 */
export const recurrenceRuleValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const recurrence: unknown = group.get('recurrence')?.value;
  const days: unknown = group.get('recurrenceDays')?.value;
  const ends: unknown = group.get('recurrenceEnds')?.value;
  const endDate: unknown = group.get('recurrenceEndDate')?.value;
  const dueDate: unknown = group.get('dueDate')?.value;

  if (recurrence === 'none') return null;

  const errors: ValidationErrors = {};
  if (recurrence === 'weekly' && !(Array.isArray(days) && days.length)) {
    errors['recurrenceDaysRequired'] = true;
  }
  if (ends === 'date') {
    if (!endDate) errors['recurrenceEndDateRequired'] = true;
    else if (typeof dueDate === 'string' && dueDate && String(endDate) < dueDate) {
      errors['recurrenceEndBeforeDueDate'] = true;
    }
  }
  return Object.keys(errors).length ? errors : null;
};
