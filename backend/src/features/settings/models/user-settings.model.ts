import type { UserSetting } from '@prisma/client';
import {
  DASHBOARD_PROJECT_SORTS,
  DEFAULT_THEME_SETTINGS,
  type DashboardProjectSort,
  type ThemeSettings,
} from '../types';

export type UserSettingsRecord = UserSetting;
export type UserSettings = {
  userId: string;
  dashboardTaskLimit: number;
  dashboardProjectLimit: number;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  fontFamily:
    'system' | 'sans-serif' | 'serif' | 'monospace' | 'atkinson-hyperlegible';
  theme: ThemeSettings;
  /** The project new tasks go to; null means the Inbox. */
  defaultProjectId: number | null;
  dashboardProjectSort: DashboardProjectSort;
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
    defaultProjectId: record.defaultProjectId ?? null,
    dashboardProjectSort: (
      DASHBOARD_PROJECT_SORTS as readonly string[]
    ).includes(record.dashboardProjectSort)
      ? (record.dashboardProjectSort as DashboardProjectSort)
      : 'custom',
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}
