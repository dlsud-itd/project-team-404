import { z } from 'zod';

const queryBoolean = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export const listProjectsQueryValidator = z
  .object({
    isFavorite: queryBoolean.optional(),
    isArchived: queryBoolean.optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    orderBy: z.enum(['sortOrder', 'name', 'createdAt', 'updatedAt']).optional(),
    orderDirection: z.enum(['asc', 'desc']).optional(),
    limit: z
      .string()
      .regex(/^[1-9]\d*$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(100))
      .optional(),
  })
  .strict();
