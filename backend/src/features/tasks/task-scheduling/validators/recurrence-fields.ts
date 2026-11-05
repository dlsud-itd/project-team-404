import { z } from 'zod';

export const taskRecurrenceField = z
  .enum(['none', 'daily', 'weekly', 'monthly'])
  .nullable()
  .optional();

/** Weekdays, 0 = Sunday … 6 = Saturday; sent back sorted and without repeats. */
export const recurrenceDaysField = z
  .array(z.number().int().min(0).max(6))
  .max(7)
  .transform((days) => [...new Set(days)].sort((a, b) => a - b))
  .optional();

/** YYYY-MM-DD, or null to repeat forever. */
export const recurrenceEndDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

type RecurrenceRuleFields = {
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  recurrenceDays?: number[];
  recurrenceEndDate?: string | null;
  dueDate?: string | null;
};

/**
 * Days and an end date only make sense with the repeat they belong to, so a body that sets
 * them must also say how the task repeats.
 */
export function checkRecurrenceRule(
  value: RecurrenceRuleFields,
  ctx: z.RefinementCtx
): void {
  const { recurrence, recurrenceDays, recurrenceEndDate, dueDate } = value;

  if (recurrenceDays?.length && recurrence !== 'weekly') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recurrenceDays'],
      message: 'Recurrence days need a weekly recurrence',
    });
  }
  if (recurrenceEndDate && (!recurrence || recurrence === 'none')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recurrenceEndDate'],
      message: 'A recurrence end date needs a repeating task',
    });
  }
  if (recurrenceEndDate && dueDate && recurrenceEndDate < dueDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recurrenceEndDate'],
      message: 'The recurrence end date cannot be before the due date',
    });
  }
}
