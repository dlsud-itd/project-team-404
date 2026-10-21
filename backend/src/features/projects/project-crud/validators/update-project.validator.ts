import { z } from 'zod';

export const updateProjectValidator = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().max(500).nullable().optional(),
    color: z.string().regex(/^#[\da-fA-F]{6}$/).nullable().optional(),
    isFavorite: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one project field must be provided',
  });
