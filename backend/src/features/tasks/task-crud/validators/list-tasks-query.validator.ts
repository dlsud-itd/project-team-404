import { z } from 'zod';

export const listTasksQueryValidator = z
  .object({
    projectId: z.coerce.number().int().positive().optional(),
    status: z.enum(['active', 'completed', 'all']).default('active'),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  })
  .strict();
