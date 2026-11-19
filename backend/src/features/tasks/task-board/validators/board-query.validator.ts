import { z } from 'zod';
import {
  taskFilterValidator,
  validateTaskFilterCombinations,
} from '../../task-organization/validators/task-filter.validator';

export const boardQueryValidator = z
  .object({
    projectId: z.coerce.number().int().positive(),
    status: z.enum(['all', 'active', 'completed']).default('all'),
    ...taskFilterValidator.shape,
    isArchived: z
      .literal('false')
      .transform(() => false)
      .optional(),
  })
  .strict()
  .superRefine(validateTaskFilterCombinations);

export type BoardQuery = z.infer<typeof boardQueryValidator>;
