import { FormControl } from '@angular/forms';
import { projectNameValidator } from './project-name.validator';

const validate = (value: unknown) => projectNameValidator(new FormControl(value));

describe('projectNameValidator', () => {
  it('requires a name', () => {
    expect(validate('')).toEqual({ required: true });
    expect(validate(null)).toEqual({ required: true });
  });

  it('treats a name of only spaces as missing', () => {
    expect(validate('   ')).toEqual({ required: true });
  });

  it('accepts a name of exactly 150 characters', () => {
    expect(validate('a'.repeat(150))).toBeNull();
  });

  it('rejects a name over 150 characters', () => {
    expect(validate('a'.repeat(151))).toEqual({
      maxlength: { requiredLength: 150, actualLength: 151 },
    });
  });

  it('measures the length after trimming', () => {
    expect(validate(`  ${'a'.repeat(150)}  `)).toBeNull();
  });

  it('accepts an ordinary name', () => {
    expect(validate('Capstone')).toBeNull();
  });
});
