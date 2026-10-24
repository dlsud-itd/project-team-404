import { z } from 'zod';

export const listProjectsQueryValidator = z
  .object({
    isArchived: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .strict();
