import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { PROJECT_NAME_MAX_LENGTH } from '../../shared/types/project.types';

/**
 * Requires a name that is not just spaces and fits the 150-character API limit once trimmed.
 * Errors use Angular's `required` and `maxlength` shapes so templates can treat them alike.
 */
export const projectNameValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (!value) return { required: true };
  if (value.length > PROJECT_NAME_MAX_LENGTH) {
    return { maxlength: { requiredLength: PROJECT_NAME_MAX_LENGTH, actualLength: value.length } };
  }
  return null;
};
