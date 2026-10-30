import { z } from 'zod';

export const recurrenceRuleValidator = z
  .object({
    recurrence: z
      .enum(['none', 'daily', 'weekly', 'monthly'])
      .nullable()
      .optional(),
  })
  .strict();
