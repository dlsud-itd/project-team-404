import { z } from 'zod';

export const taskLabelsValidator = z
  .object({
    labelIds: z.array(z.number().int().positive()).min(1).max(50),
  })
  .strict();

export const taskLabelIdValidator = z.coerce.number().int().positive();
