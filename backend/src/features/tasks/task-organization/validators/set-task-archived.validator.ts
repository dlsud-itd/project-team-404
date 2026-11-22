import { z } from 'zod';

export const setTaskArchivedValidator = z
  .object({
    isArchived: z.boolean(),
  })
  .strict();
