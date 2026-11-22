import { z } from 'zod';
import {
  taskFilterValidator,
  validateTaskFilterCombinations,
} from '../../task-organization/validators/task-filter.validator';

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'Date must be a valid YYYY-MM-DD calendar date');

export const timelineQueryValidator = z
  .object({
    from: calendarDate,
    to: calendarDate,
    projectId: z.coerce.number().int().positive().optional(),
    includeCompleted: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .default(false),
    status: z.enum(['all', 'active', 'completed']).default('all'),
    ...taskFilterValidator.shape,
  })
  .strict()
  .superRefine((query, context) => {
    validateTaskFilterCombinations(query, context);
    if (query.from > query.to) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'to must be on or after from',
      });
      return;
    }

    const from = Date.parse(`${query.from}T00:00:00.000Z`);
    const to = Date.parse(`${query.to}T00:00:00.000Z`);
    if ((to - from) / 86_400_000 + 1 > 92) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Date range must not exceed 92 calendar days',
      });
    }
  });

export type TimelineQuery = z.infer<typeof timelineQueryValidator>;
