import { z } from 'zod';

export const updateTaskValidator = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    projectId: z.number().int().positive().nullable().optional(),
    scheduledDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    dueDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    deadline: z.string().datetime({ offset: true }).nullable().optional(),
    recurrence: z
      .enum(['none', 'daily', 'weekly', 'monthly'])
      .nullable()
      .optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    isDone: z.boolean().optional(),
    doneAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one task field must be provided',
  });
