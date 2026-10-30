import { z } from 'zod';

export const taskOrderValidator = z
  .object({
    orderBy: z.enum(['dueDate', 'createdAt', 'priority', 'title']).optional(),
    orderDirection: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();
