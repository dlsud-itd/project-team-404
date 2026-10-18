import { z } from 'zod';
import { emailValidator } from '../../shared/validators/email.validator';

export const forgotPasswordValidator = z.object({ email: emailValidator });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordValidator>;
