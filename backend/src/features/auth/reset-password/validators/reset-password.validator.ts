import { z } from 'zod';
import { passwordValidator } from '../../shared/validators/password.validator';

export const resetPasswordValidator = z
  .object({
    token: z.string().trim().min(1),
    password: passwordValidator.optional(),
    newPassword: passwordValidator.optional(),
    confirmPassword: z.string().optional(),
  })
  .transform((input) => {
    const password = input.newPassword ?? input.password ?? '';
    return {
      token: input.token,
      password,
      confirmPassword: input.confirmPassword ?? password,
    };
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((input) => input.password.length >= 8, {
    path: ['newPassword'],
    message: 'Password must be at least 8 characters',
  });
export type ResetPasswordInput = typeof resetPasswordValidator._output;
