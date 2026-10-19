import { z } from 'zod';

export const emailValidator = z
  .email()
  .max(255)
  .transform((email) => email.trim().toLowerCase());
