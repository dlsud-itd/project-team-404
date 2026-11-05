import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { LABEL_NAME_MAX_LENGTH, type Label } from '../types/label.types';

/**
 * Requires a name that is not just spaces and fits the 50-character API limit once trimmed.
 * Errors use Angular's `required` and `maxlength` shapes so templates can treat them alike.
 */
export const labelNameValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (!value) return { required: true };
  if (value.length > LABEL_NAME_MAX_LENGTH) {
    return { maxlength: { requiredLength: LABEL_NAME_MAX_LENGTH, actualLength: value.length } };
  }
  return null;
};

/**
 * Flags a name another of the user's labels already has, as `{ nameTaken: true }`. Like the
 * backend's unique constraint the match is exact after trimming, so "work" and "Work" may coexist.
 *
 * @param labels  the user's labels, read on every check so the list can change after creation
 * @param ownId   the label being edited, which may keep its own name; null when creating
 */
export function uniqueLabelNameValidator(
  labels: () => readonly Label[],
  ownId: () => number | null = () => null,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    if (!value) return null;
    const id = ownId();
    const taken = labels().some((l) => l.labelId !== id && l.name === value);
    return taken ? { nameTaken: true } : null;
  };
}
