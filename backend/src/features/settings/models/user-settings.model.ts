import type { UserSetting } from '@prisma/client';

export type UserSettingsRecord = UserSetting;
export type UserSettings = {
  userId: string;
  dashboardTaskLimit: number;
  dashboardProjectLimit: number;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  fontFamily:
    'system' | 'sans-serif' | 'serif' | 'monospace' | 'atkinson-hyperlegible';
  createdAt: Date;
  updatedAt: Date;
};

export function toUserSettingsModel(record: UserSettingsRecord): UserSettings {
  return {
    userId: record.userId,
    dashboardTaskLimit: record.dashboardTaskLimit,
    dashboardProjectLimit: record.dashboardProjectLimit,
    fontSize: record.fontSize as UserSettings['fontSize'],
    fontFamily: record.fontFamily as UserSettings['fontFamily'],
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}
