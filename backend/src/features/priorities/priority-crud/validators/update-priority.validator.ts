import { z } from 'zod';

export const updatePriorityValidator = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional()
      .nullable(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one update field must be provided',
  });
