import { z } from 'zod';
import { labelColor, labelName } from './create-label.validator';

export const updateLabelValidator = z
  .object({
    name: labelName.optional(),
    color: labelColor,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one label field must be provided',
  });
