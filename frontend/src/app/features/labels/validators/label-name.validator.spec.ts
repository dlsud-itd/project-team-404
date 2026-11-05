import { FormControl } from '@angular/forms';
import { ERRANDS, STUDY } from '../testing/helpers/api-label';
import type { Label } from '../types/label.types';
import { labelNameValidator, uniqueLabelNameValidator } from './label-name.validator';

describe('labelNameValidator', () => {
  const validate = (value: unknown) => labelNameValidator(new FormControl(value));

  it('requires a name', () => {
    expect(validate('')).toEqual({ required: true });
    expect(validate(null)).toEqual({ required: true });
    expect(validate(42)).toEqual({ required: true });
  });

  it('treats a name of only spaces as missing', () => {
    expect(validate('   ')).toEqual({ required: true });
  });

  it('accepts a name of exactly 50 characters', () => {
    expect(validate('a'.repeat(50))).toBeNull();
  });

  it('rejects a name over 50 characters', () => {
    expect(validate('a'.repeat(51))).toEqual({
      maxlength: { requiredLength: 50, actualLength: 51 },
    });
  });

  it('measures the length after trimming', () => {
    expect(validate(`  ${'a'.repeat(50)}  `)).toBeNull();
  });

  it('accepts an ordinary name', () => {
    expect(validate('Study')).toBeNull();
  });
});

describe('uniqueLabelNameValidator', () => {
  let labels: Label[];
  const validate = (value: unknown, ownId: number | null = null) =>
    uniqueLabelNameValidator(
      () => labels,
      () => ownId,
    )(new FormControl(value));

  beforeEach(() => {
    labels = [STUDY, ERRANDS];
  });

  it('flags a name another label already has', () => {
    expect(validate('Study')).toEqual({ nameTaken: true });
  });

  it('compares after trimming', () => {
    expect(validate('  Study ')).toEqual({ nameTaken: true });
  });

  it('matches case exactly, like the database', () => {
    expect(validate('study')).toBeNull();
  });

  it('lets the label being edited keep its own name', () => {
    expect(validate('Study', STUDY.labelId)).toBeNull();
    expect(validate('errands', STUDY.labelId)).toEqual({ nameTaken: true });
  });

  it('reads the label list on every check', () => {
    expect(validate('Reading')).toBeNull();

    labels = [...labels, { labelId: 11, name: 'Reading', color: null }];

    expect(validate('Reading')).toEqual({ nameTaken: true });
  });

  it('leaves empty values to the name validator', () => {
    expect(validate('')).toBeNull();
    expect(validate(null)).toBeNull();
  });

  it('treats every name as its own when no id getter is given', () => {
    const control = new FormControl('Study');
    expect(uniqueLabelNameValidator(() => labels)(control)).toEqual({ nameTaken: true });
  });
});
