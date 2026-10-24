import { z } from 'zod';

export const timezoneValidator = z
  .string()
  .min(1)
  .max(64)
  .refine(
    (timezone) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid IANA timezone' }
  );
