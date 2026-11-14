import { prisma } from '../../../../shared/db/prisma.client';

export async function getOrCreateSettings(userId: string) {
  return prisma.userSetting.upsert({
    where: { userId },
    create: {
      userId,
      dashboardTaskLimit: 5,
      dashboardProjectLimit: 5,
      fontSize: 'medium',
      fontFamily: 'system',
    },
    update: {},
  });
}
