import { z } from 'zod';

const queryBoolean = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export const listLabelsQueryValidator = z
  .object({
    isArchived: queryBoolean.default(false),
  })
  .strict();

export type ListLabelsQuery = z.infer<typeof listLabelsQueryValidator>;
