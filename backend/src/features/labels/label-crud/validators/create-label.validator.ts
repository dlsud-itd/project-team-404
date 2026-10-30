import { z } from 'zod';

export const labelName = z.string().trim().min(1).max(50);
export const labelColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullable()
  .optional();

export const createLabelValidator = z
  .object({
    name: labelName,
    color: labelColor,
  })
  .strict();
