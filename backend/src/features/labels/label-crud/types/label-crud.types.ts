import type { z } from 'zod';
import type { createLabelValidator } from '../validators/create-label.validator';
import type { updateLabelValidator } from '../validators/update-label.validator';

export type CreateLabelInput = z.infer<typeof createLabelValidator>;
export type UpdateLabelInput = z.infer<typeof updateLabelValidator>;
