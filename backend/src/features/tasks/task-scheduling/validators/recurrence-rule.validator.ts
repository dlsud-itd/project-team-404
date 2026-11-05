import { z } from 'zod';
import {
  checkRecurrenceRule,
  recurrenceDaysField,
  recurrenceEndDateField,
  taskRecurrenceField,
} from './recurrence-fields';

export const recurrenceRuleValidator = z
  .object({
    recurrence: taskRecurrenceField,
    recurrenceDays: recurrenceDaysField,
    recurrenceEndDate: recurrenceEndDateField,
  })
  .strict()
  .superRefine(checkRecurrenceRule);
