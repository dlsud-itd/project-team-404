import { z } from 'zod';

export const projectIdParamValidator = z.coerce.number().int().positive();
