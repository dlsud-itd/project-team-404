import { z } from 'zod';

const priorities = ['low', 'medium', 'high'] as const;

const priorityValue = z.string().trim().toLowerCase().pipe(z.enum(priorities));

const prioritiesValue = z.string().transform((value, context) => {
  const values = value.split(',').map((item) => item.trim().toLowerCase());
  if (
    values.length === 0 ||
    values.some(
      (item) => !priorities.includes(item as (typeof priorities)[number])
    )
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Priorities must be comma-separated low, medium, or high values',
    });
    return z.NEVER;
  }

  const uniqueValues = [...new Set(values)];
  if (uniqueValues.length > 20) {
    context.addIssue({
      code: 'custom',
      message: 'At most 20 distinct priorities may be requested',
    });
    return z.NEVER;
  }
  return uniqueValues as (typeof priorities)[number][];
});

const labelIdsValue = z.string().transform((value, context) => {
  const values = value.split(',').map((item) => item.trim());
  if (values.some((item) => !/^[1-9]\d*$/.test(item))) {
    context.addIssue({
      code: 'custom',
      message: 'Label IDs must be comma-separated positive integers',
    });
    return z.NEVER;
  }

  const uniqueValues = [...new Set(values.map(Number))];
  if (uniqueValues.some((item) => !Number.isSafeInteger(item))) {
    context.addIssue({
      code: 'custom',
      message: 'Label IDs must be safe positive integers',
    });
    return z.NEVER;
  }
  if (uniqueValues.length > 50) {
    context.addIssue({
      code: 'custom',
      message: 'At most 50 distinct labels may be requested',
    });
    return z.NEVER;
  }
  return uniqueValues;
});

const queryBoolean = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const dateValue = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, 'Date must be a valid YYYY-MM-DD calendar date');

const taskFilterFields = {
  priority: priorityValue.optional(),
  priorities: prioritiesValue.optional(),
  labelId: z.coerce.number().int().positive().optional(),
  labelIds: labelIdsValue.optional(),
  labelMatch: z.enum(['any', 'all']).optional(),
  dueFrom: dateValue.optional(),
  dueTo: dateValue.optional(),
  hasDueDate: queryBoolean.optional(),
  overdue: z
    .literal('true')
    .transform(() => true)
    .optional(),
  recurring: queryBoolean.optional(),
  isDone: queryBoolean.optional(),
};

type TaskFilterValues = z.infer<z.ZodObject<typeof taskFilterFields>> & {
  status?: 'all' | 'active' | 'completed';
};

function validateTaskFilterCombinations(
  filters: TaskFilterValues,
  context: z.RefinementCtx
) {
  if (filters.priority !== undefined && filters.priorities !== undefined) {
    context.addIssue({
      code: 'custom',
      path: ['priorities'],
      message: 'Use either priority or priorities, not both',
    });
  }
  if (filters.labelId !== undefined && filters.labelIds !== undefined) {
    context.addIssue({
      code: 'custom',
      path: ['labelIds'],
      message: 'Use either labelId or labelIds, not both',
    });
  }
  if (
    filters.dueFrom !== undefined &&
    filters.dueTo !== undefined &&
    filters.dueFrom > filters.dueTo
  ) {
    context.addIssue({
      code: 'custom',
      path: ['dueFrom'],
      message: 'dueFrom must not be later than dueTo',
    });
  }
  if (
    filters.isDone !== undefined &&
    filters.status !== undefined &&
    filters.status !== 'all'
  ) {
    context.addIssue({
      code: 'custom',
      path: ['isDone'],
      message: 'isDone cannot be combined with a non-default status',
    });
  }
  if (
    filters.overdue &&
    (filters.status === 'completed' || filters.isDone === true)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['overdue'],
      message: 'overdue cannot be combined with completed tasks',
    });
  }
}

export const taskFilterValidator = z
  .object(taskFilterFields)
  .strict()
  .superRefine(validateTaskFilterCombinations);

export { validateTaskFilterCombinations };
