import type { z } from 'zod';
import type { taskLabelsValidator } from '../validators/task-labels.validator';
import type { taskPriorityValidator } from '../validators/priority.validator';

export type SetTaskPriorityInput = z.infer<typeof taskPriorityValidator>;
export type AttachTaskLabelsInput = z.infer<typeof taskLabelsValidator>;
