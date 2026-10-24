import type { z } from 'zod';
import type { signupValidator } from '../validators/signup.validator';

export type SignupInput = z.infer<typeof signupValidator>;
export type SignupResult = { userId: string; inboxProjectId: number };
