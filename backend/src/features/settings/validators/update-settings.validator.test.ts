import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_SETTINGS } from '../types';
import { updateSettingsValidator } from './update-settings.validator';

describe('updateSettingsValidator theme', () => {
  it('accepts a complete theme palette', () => {
    expect(
      updateSettingsValidator.safeParse({ theme: DEFAULT_THEME_SETTINGS })
        .success
    ).toBe(true);
  });

  it('rejects invalid colors and presets from another color mode', () => {
    expect(
      updateSettingsValidator.safeParse({
        theme: {
          ...DEFAULT_THEME_SETTINGS,
          colors: { ...DEFAULT_THEME_SETTINGS.colors, primary: 'orange' },
        },
      }).success
    ).toBe(false);

    expect(
      updateSettingsValidator.safeParse({
        theme: { ...DEFAULT_THEME_SETTINGS, preset: 'midnight' },
      }).success
    ).toBe(false);
  });
});
