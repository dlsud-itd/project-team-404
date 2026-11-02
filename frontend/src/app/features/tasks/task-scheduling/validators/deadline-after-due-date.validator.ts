import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Checks a group with dueDate and deadline controls: the deadline must not be earlier than the
 * due date, though it can be the same day. Dates are YYYY-MM-DD strings, so they compare
 * correctly as text. The server does not check this, so this rule is the only guard.
 */
export const deadlineAfterDueDateValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const dueDate: unknown = group.get('dueDate')?.value;
  const deadline: unknown = group.get('deadline')?.value;

  if (typeof dueDate !== 'string' || typeof deadline !== 'string') return null;
  if (!dueDate || !deadline) return null;
  return deadline < dueDate ? { deadlineBeforeDueDate: true } : null;
};
