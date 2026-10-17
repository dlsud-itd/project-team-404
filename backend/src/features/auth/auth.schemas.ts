import { z } from 'zod';

const isIanaTimezone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

export const signupSchema = z
  .object({
    username: z.string().trim().min(1).max(50),
    email: z
      .email()
      .max(255)
      .transform((email) => email.toLowerCase()),
    password: z.string().min(8),
    confirmPassword: z.string(),
    timezone: z.string().min(1).max(64).refine(isIanaTimezone, {
      message: 'Must be a valid IANA timezone',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(1000),
});

export const forgotPasswordSchema = z.object({
  email: z
    .email()
    .max(255)
    .transform((email) => email.toLowerCase()),
});

export const resetTokenSchema = z.string().trim().min(1);

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    password: z.string().min(8).optional(),
    newPassword: z.string().min(8).optional(),
    confirmPassword: z.string().optional(),
  })
  .transform((data) => {
    const password = data.newPassword ?? data.password ?? '';
    const confirmPassword = data.confirmPassword ?? password;
    return {
      token: data.token,
      password,
      confirmPassword,
    };
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const usernameParamSchema = z.string().trim().min(1).max(50);
export const emailParamSchema = z
  .email()
  .max(255)
  .transform((email) => email.toLowerCase());

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
