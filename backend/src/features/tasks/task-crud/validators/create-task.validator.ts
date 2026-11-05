import { z } from 'zod';
import {
  checkRecurrenceRule,
  recurrenceDaysField,
  recurrenceEndDateField,
  taskRecurrenceField,
} from '../../task-scheduling/validators/recurrence-fields';

const taskTitle = z.string().trim().min(1).max(200);
const taskDescription = z.string().trim().max(1000).nullable().optional();
const taskProjectId = z.number().int().positive().nullable().optional();
const taskDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();
const taskDeadline = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional();
const taskPriority = z.enum(['low', 'medium', 'high']).optional();

export const createTaskValidator = z
  .object({
    title: taskTitle,
    description: taskDescription,
    projectId: taskProjectId,
    scheduledDate: taskDate,
    dueDate: taskDate,
    deadline: taskDeadline,
    recurrence: taskRecurrenceField,
    recurrenceDays: recurrenceDaysField,
    recurrenceEndDate: recurrenceEndDateField,
    priority: taskPriority,
    isDone: z.boolean().optional(),
    doneAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .superRefine(checkRecurrenceRule);
