import { z } from 'zod';
import { timezoneValidator, usernameValidator } from '../../shared/validators';

export const profileUpdateValidator = z
  .object({
    username: usernameValidator.optional(),
    timezone: timezoneValidator.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one profile field must be provided',
  });
