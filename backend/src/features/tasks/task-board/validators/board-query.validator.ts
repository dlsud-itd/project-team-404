import { z } from 'zod';
import {
  taskFilterValidator,
  validateTaskFilterCombinations,
} from '../../task-organization/validators/task-filter.validator';

export const boardQueryValidator = z
  .object({
    // Left out, the board shows every task in every active project.
    projectId: z.coerce.number().int().positive().optional(),
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
