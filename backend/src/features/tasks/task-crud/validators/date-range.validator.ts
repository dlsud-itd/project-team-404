import { z } from 'zod';

type DateRangeFields = {
  scheduledDate?: string | null;
  dueDate?: string | null;
};

/** A task runs from its start date (scheduledDate) to its end date (dueDate), never backwards. */
export function checkDateRange(
  { scheduledDate, dueDate }: DateRangeFields,
  ctx: z.RefinementCtx
): void {
  if (scheduledDate && dueDate && dueDate < scheduledDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dueDate'],
      message: 'End date cannot be before the start date',
    });
  }
}
