import { z } from 'zod';

export const priorityIdParamValidator = z.coerce.number().int().positive();
