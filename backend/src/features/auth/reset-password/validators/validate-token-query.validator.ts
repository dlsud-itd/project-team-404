import { z } from 'zod';

export const validateTokenQueryValidator = z.object({
  token: z.string().trim().min(1),
});
export type ValidateTokenQuery = z.infer<typeof validateTokenQueryValidator>;
