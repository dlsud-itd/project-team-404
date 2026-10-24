import { z } from 'zod';
import { passwordValidator } from '../../shared/validators/password.validator';

export const changePasswordValidator = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordValidator,
    confirmPassword: z.string(),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((input) => input.newPassword !== input.currentPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password',
  });

export type ChangePasswordInput = z.infer<typeof changePasswordValidator>;
