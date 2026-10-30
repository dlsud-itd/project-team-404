import { z } from 'zod';

export const taskPriorityValidator = z
  .object({
    priority: z.enum(['low', 'medium', 'high']),
  })
  .strict();
