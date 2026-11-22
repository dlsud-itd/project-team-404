import { describe, expect, it } from 'vitest';
import { createLabelValidator } from './create-label.validator';

describe('createLabelValidator', () => {
  it('trims a valid name and accepts an optional hex color', () => {
    expect(
      createLabelValidator.parse({ name: ' Work ', color: '#aBc123' })
    ).toEqual({ name: 'Work', color: '#aBc123' });
  });

  it('rejects blank or overlong names and invalid colors', () => {
    expect(() => createLabelValidator.parse({ name: ' ' })).toThrow();
    expect(() =>
      createLabelValidator.parse({ name: 'x'.repeat(51) })
    ).toThrow();
    expect(() =>
      createLabelValidator.parse({ name: 'Work', color: 'red' })
    ).toThrow();
  });
});
