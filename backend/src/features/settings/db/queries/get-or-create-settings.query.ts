import { prisma } from '../../../../shared/db/prisma.client';
import { DEFAULT_THEME_SETTINGS } from '../../types';

export async function getOrCreateSettings(userId: string) {
  return prisma.userSetting.upsert({
    where: { userId },
    create: {
      userId,
      dashboardTaskLimit: 5,
      dashboardProjectLimit: 5,
      fontSize: 'medium',
      fontFamily: 'system',
      theme: DEFAULT_THEME_SETTINGS,
    },
    update: {},
  });
}
