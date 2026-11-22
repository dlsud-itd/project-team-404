/** Text size options for Preferences. */
export type FontSize = 'small' | 'medium' | 'large' | 'x-large';

/** Font options for Preferences. */
export type FontFamily = 'system' | 'sans-serif' | 'serif' | 'monospace' | 'atkinson-hyperlegible';

/** The user's settings, as GET/PATCH /api/settings send them. */
export interface UserSettings {
  /** How many tasks each dashboard widget lists before "View all". */
  dashboardTaskLimit: number;
  /** How many projects the dashboard project list shows before "View all". */
  dashboardProjectLimit: number;
  fontSize: FontSize;
  fontFamily: FontFamily;
  /** ISO instant of the last save, or null before the server has answered. */
  updatedAt: string | null;
}

/** The fields PATCH /api/settings accepts; at least one is required. */
export type SettingsChanges = Partial<Omit<UserSettings, 'updatedAt'>>;

/** How the app's text looks: the part of the settings applied to the page. */
export type Appearance = Pick<UserSettings, 'fontSize' | 'fontFamily'>;

/** The server's defaults, also used before the user's settings have loaded. */
export const DEFAULT_SETTINGS: UserSettings = {
  dashboardTaskLimit: 5,
  dashboardProjectLimit: 5,
  fontSize: 'medium',
  fontFamily: 'system',
  updatedAt: null,
};

/** Bounds for both dashboard limits. */
export const DASHBOARD_LIMIT_MIN = 1;
export const DASHBOARD_LIMIT_MAX = 50;

/** Each size's label and the root font size it sets; every rem in the app scales with it. */
export const FONT_SIZES: readonly { value: FontSize; label: string; css: string }[] = [
  { value: 'small', label: 'Small', css: '87.5%' },
  { value: 'medium', label: 'Medium', css: '100%' },
  { value: 'large', label: 'Large', css: '112.5%' },
  { value: 'x-large', label: 'Extra large', css: '125%' },
];

/**
 * Each font's label and CSS stack. "System" keeps the app's standard look: Archivo, falling back
 * to the device's own interface font.
 */
export const FONT_FAMILIES: readonly { value: FontFamily; label: string; css: string }[] = [
  {
    value: 'system',
    label: 'System',
    css: "'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  {
    value: 'sans-serif',
    label: 'Sans-serif',
    css: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  { value: 'serif', label: 'Serif', css: "Georgia, Cambria, 'Times New Roman', Times, serif" },
  {
    value: 'monospace',
    label: 'Monospace',
    css: "ui-monospace, 'Cascadia Mono', Consolas, 'SF Mono', Menlo, monospace",
  },
  {
    value: 'atkinson-hyperlegible',
    label: 'Atkinson Hyperlegible',
    css: "'Atkinson Hyperlegible', system-ui, sans-serif",
  },
];

export function isFontSize(value: unknown): value is FontSize {
  return FONT_SIZES.some((size) => size.value === value);
}

export function isFontFamily(value: unknown): value is FontFamily {
  return FONT_FAMILIES.some((family) => family.value === value);
}
