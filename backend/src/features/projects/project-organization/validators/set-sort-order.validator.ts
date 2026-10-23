import { z } from 'zod';

export const setSortOrderValidator = z
  .object({
    sortOrder: z.number().int().nonnegative(),
  })
  .strict();
