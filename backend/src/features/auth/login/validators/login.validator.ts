import { z } from 'zod';

export const loginValidator = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(1000),
});

export type LoginInput = z.infer<typeof loginValidator>;
