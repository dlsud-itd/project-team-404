import { z } from 'zod';

export const boardStatuses = ['todo', 'in_progress', 'done'] as const;

export const boardReorderValidator = z
  .object({
    projectId: z.number().int().positive(),
    boardStatus: z.enum(boardStatuses),
    tasks: z
      .array(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))
      .min(1)
      .max(500),
  })
  .strict()
  .superRefine((request, context) => {
    if (new Set(request.tasks).size !== request.tasks.length) {
      context.addIssue({
        code: 'custom',
        path: ['tasks'],
        message: 'Task IDs must be unique',
      });
    }
  });

export type BoardReorderInput = z.infer<typeof boardReorderValidator>;
export type BoardStatus = (typeof boardStatuses)[number];
