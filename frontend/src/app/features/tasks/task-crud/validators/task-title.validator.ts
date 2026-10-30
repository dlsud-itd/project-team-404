import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { TASK_TITLE_MAX_LENGTH } from '../../shared/types/task.types';

/**
 * Requires a title that is not just spaces and fits the 200-character API limit once trimmed.
 * Errors use Angular's `required` and `maxlength` shapes so templates can treat them alike.
 */
export const taskTitleValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (!value) return { required: true };
  if (value.length > TASK_TITLE_MAX_LENGTH) {
    return { maxlength: { requiredLength: TASK_TITLE_MAX_LENGTH, actualLength: value.length } };
  }
  return null;
};
