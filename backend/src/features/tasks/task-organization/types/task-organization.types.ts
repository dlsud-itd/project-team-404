import type { z } from 'zod';
import type { taskLabelsValidator } from '../validators/task-labels.validator';
import type { taskPriorityValidator } from '../validators/priority.validator';
import type { reorderTasksValidator } from '../validators/reorder-tasks.validator';

export type SetTaskPriorityInput = z.infer<typeof taskPriorityValidator>;
export type AttachTaskLabelsInput = z.infer<typeof taskLabelsValidator>;
export type ReorderTasksInput = z.infer<typeof reorderTasksValidator>;
