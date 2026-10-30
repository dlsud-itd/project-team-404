import { FormControl } from '@angular/forms';
import { taskTitleValidator } from './task-title.validator';

const validate = (value: unknown) => taskTitleValidator(new FormControl(value));

describe('taskTitleValidator', () => {
  it('requires a title', () => {
    expect(validate('')).toEqual({ required: true });
    expect(validate(null)).toEqual({ required: true });
  });

  it('treats a title of only spaces as missing', () => {
    expect(validate('   ')).toEqual({ required: true });
  });

  it('accepts a title of exactly 200 characters', () => {
    expect(validate('a'.repeat(200))).toBeNull();
  });

  it('rejects a title over 200 characters', () => {
    expect(validate('a'.repeat(201))).toEqual({
      maxlength: { requiredLength: 200, actualLength: 201 },
    });
  });

  it('measures the length after trimming', () => {
    expect(validate(`  ${'a'.repeat(200)}  `)).toBeNull();
  });

  it('accepts an ordinary title', () => {
    expect(validate('Study ILT Module 4')).toBeNull();
  });
});
