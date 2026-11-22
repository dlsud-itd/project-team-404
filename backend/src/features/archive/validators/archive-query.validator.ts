import { z } from 'zod';
import { decodeArchiveCursor } from '../utils/archive-cursor';

const cursorValue = z.string().transform((value, context) => {
  const cursor = decodeArchiveCursor(value);
  if (!cursor) {
    context.addIssue({
      code: 'custom',
      message: 'Cursor is malformed',
    });
    return z.NEVER;
  }
  return cursor;
});

export const archiveQueryValidator = z
  .object({
    type: z.enum(['all', 'tasks', 'projects', 'labels']).default('all'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: cursorValue.optional(),
  })
  .strict();
