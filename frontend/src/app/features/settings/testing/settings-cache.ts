import { SETTINGS_CACHE_KEY } from '../state/settings.store';
import { DEFAULT_SETTINGS, type UserSettings } from '../types/user-settings.types';

/**
 * Seeds the settings cache that SettingsStore reads when it is created, for specs that need
 * other limits than the defaults. Call before anything injects SettingsStore, and clear after.
 */
export function seedSettings(settings: Partial<UserSettings>): void {
  localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }));
}

export function clearSettingsCache(): void {
  localStorage.removeItem(SETTINGS_CACHE_KEY);
}
