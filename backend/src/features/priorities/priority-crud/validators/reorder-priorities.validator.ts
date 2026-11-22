import { z } from 'zod';

export const reorderPrioritiesValidator = z
  .object({
    priorityIds: z.array(z.coerce.number().int().positive()).min(1),
  })
  .strict();
