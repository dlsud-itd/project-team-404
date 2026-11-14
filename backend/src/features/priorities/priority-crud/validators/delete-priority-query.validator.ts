import { z } from 'zod';

export const deletePriorityQueryValidator = z
  .object({
    reassignTo: z.coerce.number().int().positive().optional(),
  })
  .strict();
