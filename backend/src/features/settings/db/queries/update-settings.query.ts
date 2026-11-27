import { prisma } from '../../../../shared/db/prisma.client';
import { DEFAULT_THEME_SETTINGS, type UpdateSettingsInput } from '../../types';

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
      theme: input.theme ?? DEFAULT_THEME_SETTINGS,
      defaultProjectId: input.defaultProjectId ?? null,
      dashboardProjectSort: input.dashboardProjectSort ?? 'custom',
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
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.defaultProjectId !== undefined
        ? { defaultProjectId: input.defaultProjectId }
        : {}),
      ...(input.dashboardProjectSort !== undefined
        ? { dashboardProjectSort: input.dashboardProjectSort }
        : {}),
    },
  });
}
