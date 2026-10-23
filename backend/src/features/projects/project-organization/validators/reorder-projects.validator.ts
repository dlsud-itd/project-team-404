import { z } from 'zod';

export const reorderProjectsValidator = z
  .object({
    projectIds: z.array(z.number().int().positive()),
  })
  .strict()
  .refine((data) => new Set(data.projectIds).size === data.projectIds.length, {
    path: ['projectIds'],
    message: 'Project IDs must be unique',
  });
