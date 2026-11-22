import { z } from 'zod';

export const updateSettingsValidator = z
  .object({
    dashboardTaskLimit: z.coerce.number().int().min(1).max(50).optional(),
    dashboardProjectLimit: z.coerce.number().int().min(1).max(50).optional(),
    fontSize: z.enum(['small', 'medium', 'large', 'x-large']).optional(),
    fontFamily: z
      .enum([
        'system',
        'sans-serif',
        'serif',
        'monospace',
        'atkinson-hyperlegible',
      ])
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one setting must be provided',
  });
