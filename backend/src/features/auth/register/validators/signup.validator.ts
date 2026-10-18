import { z } from 'zod';
import {
  emailValidator,
  passwordValidator,
  timezoneValidator,
  usernameValidator,
} from '../../shared/validators';

export const signupValidator = z
  .object({
    username: usernameValidator,
    email: emailValidator,
    password: passwordValidator,
    confirmPassword: z.string(),
    timezone: timezoneValidator,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
