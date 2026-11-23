import { z } from 'zod';

const themeColors = z
  .object({
    primary: z.string().regex(/^#[\da-f]{6}$/i),
    secondary: z.string().regex(/^#[\da-f]{6}$/i),
    background: z.string().regex(/^#[\da-f]{6}$/i),
    surface: z.string().regex(/^#[\da-f]{6}$/i),
    text: z.string().regex(/^#[\da-f]{6}$/i),
    muted: z.string().regex(/^#[\da-f]{6}$/i),
    border: z.string().regex(/^#[\da-f]{6}$/i),
    success: z.string().regex(/^#[\da-f]{6}$/i),
    warning: z.string().regex(/^#[\da-f]{6}$/i),
    error: z.string().regex(/^#[\da-f]{6}$/i),
    info: z.string().regex(/^#[\da-f]{6}$/i),
  })
  .strict();

const theme = z
  .object({
    mode: z.enum(['light', 'dark']),
    preset: z.enum([
      'terracotta',
      'meadow',
      'coast',
      'midnight',
      'forest',
      'violet',
    ]),
    colors: themeColors,
  })
  .strict()
  .refine(
    (value) =>
      value.mode ===
      (['terracotta', 'meadow', 'coast'].includes(value.preset)
        ? 'light'
        : 'dark'),
    { message: 'Theme preset must match its color mode' }
  );

export const updateSettingsValidator = z
  .object({
    dashboardTaskLimit: z.coerce.number().int().min(1).max(50).optional(),
    dashboardProjectLimit: z.coerce.number().int().min(1).max(50).optional(),
    fontSize: z.enum(['small', 'medium', 'large', 'x-large']).optional(),
    fontFamily: z
      .enum([
        'system',
        'sans-serif',
        'serif',
        'monospace',
        'atkinson-hyperlegible',
      ])
      .optional(),
    theme: theme.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one setting must be provided',
  });
