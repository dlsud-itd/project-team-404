import { z } from 'zod';
import { taskFilterValidator } from '../../task-organization/validators/task-filter.validator';
import { taskOrderValidator } from '../../task-organization/validators/task-order.validator';

export const listTasksQueryValidator = z
  .object({
    projectId: z.coerce.number().int().positive().optional(),
    status: z.enum(['active', 'completed', 'all']).default('active'),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    ...taskFilterValidator.shape,
    ...taskOrderValidator.shape,
  })
  .strict();
