import { z } from 'zod';

export const scheduleTaskDateValidator = z
  .object({
    scheduledDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
  })
  .strict();
