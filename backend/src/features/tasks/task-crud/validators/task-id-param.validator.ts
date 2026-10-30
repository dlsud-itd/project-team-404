import { z } from 'zod';

export const taskIdParamValidator = z.coerce.number().int().positive();
