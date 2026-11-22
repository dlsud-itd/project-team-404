import type { z } from 'zod';
import type { createTaskValidator } from '../validators/create-task.validator';
import type { listTasksQueryValidator } from '../validators/list-tasks-query.validator';
import type { updateTaskValidator } from '../validators/update-task.validator';

export type CreateTaskInput = z.infer<typeof createTaskValidator>;
export type UpdateTaskInput = z.infer<typeof updateTaskValidator>;
export type ListTasksFilters = z.infer<typeof listTasksQueryValidator>;
