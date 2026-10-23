import { z } from 'zod';

export const setArchivedValidator = z
  .object({
    isArchived: z.boolean(),
  })
  .strict();
