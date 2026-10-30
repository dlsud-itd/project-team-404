import { z } from 'zod';

export const taskFilterValidator = z
  .object({
    priority: z.enum(['low', 'medium', 'high']).optional(),
    labelId: z.coerce.number().int().positive().optional(),
  })
  .strict();
