import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Checks a group with scheduledDate (start) and dueDate (end) controls: a task can't end before it
 * starts. Either date may be empty.
 */
export const endAfterStartValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const start: unknown = group.get('scheduledDate')?.value;
  const end: unknown = group.get('dueDate')?.value;
  if (typeof start !== 'string' || typeof end !== 'string') return null;
  if (!start || !end) return null;
  return end < start ? { endBeforeStart: true } : null;
};
