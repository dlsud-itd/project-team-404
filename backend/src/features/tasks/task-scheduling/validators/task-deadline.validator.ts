import { z } from 'zod';

export const taskDeadlineValidator = z
  .object({
    deadline: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict();
