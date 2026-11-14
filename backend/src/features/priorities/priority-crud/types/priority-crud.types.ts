import type { z } from 'zod';
import type { createPriorityValidator } from '../validators/create-priority.validator';
import type { updatePriorityValidator } from '../validators/update-priority.validator';
import type { reorderPrioritiesValidator } from '../validators/reorder-priorities.validator';
import type { deletePriorityQueryValidator } from '../validators/delete-priority-query.validator';

export type CreatePriorityInput = z.infer<typeof createPriorityValidator>;
export type UpdatePriorityInput = z.infer<typeof updatePriorityValidator>;
export type ReorderPrioritiesInput = z.infer<typeof reorderPrioritiesValidator>;
export type DeletePriorityQuery = z.infer<typeof deletePriorityQueryValidator>;
