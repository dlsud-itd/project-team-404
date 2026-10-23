import { FormControl } from '@angular/forms';
import { usernameFormatValidator } from './username-format.validator';

const errorsFor = (value: string) => new FormControl(value, usernameFormatValidator).errors;

describe('usernameFormatValidator', () => {
  it.each(['james', 'james_saluta', 'j.saluta-2', 'a'.repeat(50)])('accepts "%s"', (value) => {
    expect(errorsFor(value)).toBeNull();
  });

  it('requires a value', () => {
    expect(errorsFor('')).toEqual({ required: true });
  });

  it('rejects more than 50 characters', () => {
    expect(errorsFor('a'.repeat(51))).toHaveProperty('maxlength');
  });

  it.each(['james saluta', 'james!', 'jämes'])('rejects the characters in "%s"', (value) => {
    expect(errorsFor(value)).toHaveProperty('pattern');
  });
});
