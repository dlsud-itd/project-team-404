import { z } from 'zod';

export const labelIdParamValidator = z.coerce.number().int().positive();
