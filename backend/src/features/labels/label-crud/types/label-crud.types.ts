import type { z } from 'zod';
import type { createLabelValidator } from '../validators/create-label.validator';
import type { updateLabelValidator } from '../validators/update-label.validator';
import type { listLabelsQueryValidator } from '../validators/list-labels-query.validator';

export type CreateLabelInput = z.infer<typeof createLabelValidator>;
export type UpdateLabelInput = z.infer<typeof updateLabelValidator>;
export type ListLabelsQuery = z.infer<typeof listLabelsQueryValidator>;
