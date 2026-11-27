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

describe('updateSettingsValidator default project and dashboard sort', () => {
  it('accepts a project id, or null to go back to the Inbox', () => {
    expect(
      updateSettingsValidator.safeParse({ defaultProjectId: 12 }).success
    ).toBe(true);
    expect(
      updateSettingsValidator.safeParse({ defaultProjectId: null }).success
    ).toBe(true);
    expect(
      updateSettingsValidator.safeParse({ defaultProjectId: 0 }).success
    ).toBe(false);
  });

  it('accepts only the known dashboard sorts', () => {
    for (const sort of ['custom', 'name-asc', 'recent', 'created-asc']) {
      expect(
        updateSettingsValidator.safeParse({ dashboardProjectSort: sort })
          .success
      ).toBe(true);
    }
    expect(
      updateSettingsValidator.safeParse({ dashboardProjectSort: 'random' })
        .success
    ).toBe(false);
  });

  it('pairs the new Paper and Graphite presets with their modes', () => {
    expect(DEFAULT_THEME_SETTINGS.preset).toBe('paper');
    expect(
      updateSettingsValidator.safeParse({
        theme: { ...DEFAULT_THEME_SETTINGS, preset: 'graphite' },
      }).success
    ).toBe(false);
    expect(
      updateSettingsValidator.safeParse({
        theme: { ...DEFAULT_THEME_SETTINGS, mode: 'dark', preset: 'graphite' },
      }).success
    ).toBe(true);
  });
});
