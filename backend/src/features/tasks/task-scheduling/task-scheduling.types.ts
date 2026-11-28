import type { z } from 'zod';
import type { recurrenceRuleValidator } from './validators/recurrence-rule.validator';
import type { scheduleTaskDateValidator } from './validators/schedule-task-date.validator';
import type { taskDueDateValidator } from './validators/task-due-date.validator';

export type ScheduleTaskDateInput = z.infer<typeof scheduleTaskDateValidator>;
export type TaskDueDateInput = z.infer<typeof taskDueDateValidator>;
export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleValidator>;

export type TaskScheduleUpdateInput = {
  scheduledDate?: string | null;
  dueDate?: string | null;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  recurrenceDays?: number[];
  recurrenceEndDate?: string | null;
};
