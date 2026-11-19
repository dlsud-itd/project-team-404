import { z } from 'zod';

export const reorderTasksValidator = z
  .object({
    projectId: z.number().int().positive(),
    taskIds: z.array(z.number().int().positive()).min(1).max(500),
  })
  .strict()
  .refine((data) => new Set(data.taskIds).size === data.taskIds.length, {
    path: ['taskIds'],
    message: 'Task IDs must be unique',
  });
