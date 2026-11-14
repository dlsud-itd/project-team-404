import { prisma } from '../../../../shared/db/prisma.client';
import type { UpdateSettingsInput } from '../../types';

export async function updateSettings(
  userId: string,
  input: UpdateSettingsInput
) {
  return prisma.userSetting.upsert({
    where: { userId },
    create: {
      userId,
      dashboardTaskLimit: input.dashboardTaskLimit ?? 5,
      dashboardProjectLimit: input.dashboardProjectLimit ?? 5,
      fontSize: input.fontSize ?? 'medium',
      fontFamily: input.fontFamily ?? 'system',
    },
    update: {
      ...(input.dashboardTaskLimit !== undefined
        ? { dashboardTaskLimit: input.dashboardTaskLimit }
        : {}),
      ...(input.dashboardProjectLimit !== undefined
        ? { dashboardProjectLimit: input.dashboardProjectLimit }
        : {}),
      ...(input.fontSize !== undefined ? { fontSize: input.fontSize } : {}),
      ...(input.fontFamily !== undefined
        ? { fontFamily: input.fontFamily }
        : {}),
    },
  });
}
