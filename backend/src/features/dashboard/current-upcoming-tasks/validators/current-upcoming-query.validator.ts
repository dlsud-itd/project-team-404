import { z } from 'zod';

export const DEFAULT_CURRENT_UPCOMING_DAYS = 7;
export const MAX_CURRENT_UPCOMING_DAYS = 30;

export const currentUpcomingQueryValidator = z
  .object({
    days: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_CURRENT_UPCOMING_DAYS)
      .default(DEFAULT_CURRENT_UPCOMING_DAYS),
  })
  .strict();
