import { z } from 'zod';

export const taskPriorityValidator = z
  .object({
    priority: z.enum(['low', 'medium', 'high']).optional(),
    priorityId: z.coerce.number().int().positive().optional(),
  })
  .strict()
  .refine(
    (value) => value.priority !== undefined || value.priorityId !== undefined,
    {
      message: 'priority or priorityId is required',
      path: ['priority'],
    }
  );
