import { z } from 'zod';

const projectName = z.string().trim().min(1).max(150);
const projectDescription = z.string().max(500).nullable();
const projectColor = z
  .string()
  .regex(/^#[\da-fA-F]{6}$/)
  .nullable();

export const createProjectValidator = z
  .object({
    name: projectName,
    description: projectDescription.optional(),
    color: projectColor.optional(),
  })
  .strict();
