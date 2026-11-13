import { z } from 'zod';

export const taskOrderValidator = z
  .object({
    orderBy: z
      .enum([
        'dueDate',
        'deadline',
        'scheduledDate',
        'priority',
        'title',
        'createdAt',
        'updatedAt',
      ])
      .optional(),
    orderDirection: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();
