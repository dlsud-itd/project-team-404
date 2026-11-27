import { z } from 'zod';

export const setPriorityArchivedValidator = z
  .object({ isArchived: z.boolean() })
  .strict();
