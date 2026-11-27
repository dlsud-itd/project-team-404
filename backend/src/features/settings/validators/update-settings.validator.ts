import { z } from 'zod';
import {
  DARK_THEME_PRESETS,
  DASHBOARD_PROJECT_SORTS,
  LIGHT_THEME_PRESETS,
} from '../types';

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
    preset: z.enum([...LIGHT_THEME_PRESETS, ...DARK_THEME_PRESETS]),
    colors: themeColors,
  })
  .strict()
  .refine(
    (value) =>
      value.mode ===
      ((LIGHT_THEME_PRESETS as readonly string[]).includes(value.preset)
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
    /** Null goes back to the Inbox. */
    defaultProjectId: z.number().int().positive().nullable().optional(),
    dashboardProjectSort: z.enum(DASHBOARD_PROJECT_SORTS).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one setting must be provided',
  });
