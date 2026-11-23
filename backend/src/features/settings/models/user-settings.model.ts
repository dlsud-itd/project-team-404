import type { UserSetting } from '@prisma/client';
import { DEFAULT_THEME_SETTINGS, type ThemeSettings } from '../types';

export type UserSettingsRecord = UserSetting;
export type UserSettings = {
  userId: string;
  dashboardTaskLimit: number;
  dashboardProjectLimit: number;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  fontFamily:
    'system' | 'sans-serif' | 'serif' | 'monospace' | 'atkinson-hyperlegible';
  theme: ThemeSettings;
  createdAt: Date;
  updatedAt: Date;
};

export function toUserSettingsModel(record: UserSettingsRecord): UserSettings {
  const savedTheme = record.theme;
  const theme =
    typeof savedTheme === 'object' &&
    savedTheme !== null &&
    !Array.isArray(savedTheme) &&
    'mode' in savedTheme
      ? (savedTheme as unknown as ThemeSettings)
      : DEFAULT_THEME_SETTINGS;
  return {
    userId: record.userId,
    dashboardTaskLimit: record.dashboardTaskLimit,
    dashboardProjectLimit: record.dashboardProjectLimit,
    fontSize: record.fontSize as UserSettings['fontSize'],
    fontFamily: record.fontFamily as UserSettings['fontFamily'],
    theme,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}
