import { z } from 'zod';

export const setLabelArchivedValidator = z
  .object({
    isArchived: z.boolean(),
  })
  .strict();
