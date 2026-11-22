import { z } from 'zod';

export const searchQueryValidator = z
  .object({
    q: z.string().trim().min(2).max(100),
    type: z.enum(['all', 'tasks', 'projects']).default('all'),
    limit: z.coerce.number().int().min(1).max(20).default(10),
    includeArchived: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .default(false),
  })
  .strict();

export type SearchQueryInput = z.infer<typeof searchQueryValidator>;
