import type { z } from 'zod';
import type { recurrenceRuleValidator } from './validators/recurrence-rule.validator';
import type { scheduleTaskDateValidator } from './validators/schedule-task-date.validator';
import type { taskDeadlineValidator } from './validators/task-deadline.validator';
import type { taskDueDateValidator } from './validators/task-due-date.validator';

export type ScheduleTaskDateInput = z.infer<typeof scheduleTaskDateValidator>;
export type TaskDueDateInput = z.infer<typeof taskDueDateValidator>;
export type TaskDeadlineInput = z.infer<typeof taskDeadlineValidator>;
export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleValidator>;

export type TaskScheduleUpdateInput = {
  scheduledDate?: string | null;
  dueDate?: string | null;
  deadline?: string | null;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | null;
};
