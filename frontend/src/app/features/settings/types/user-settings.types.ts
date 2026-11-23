/** Text size options for Preferences. */
export type FontSize = 'small' | 'medium' | 'large' | 'x-large';

/** Font options for Preferences. */
export type FontFamily = 'system' | 'sans-serif' | 'serif' | 'monospace' | 'atkinson-hyperlegible';

export type ThemeMode = 'light' | 'dark';
export type ThemePresetId = 'terracotta' | 'meadow' | 'coast' | 'midnight' | 'forest' | 'violet';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeSettings {
  mode: ThemeMode;
  preset: ThemePresetId;
  colors: ThemeColors;
}

/** The user's settings, as GET/PATCH /api/settings send them. */
export interface UserSettings {
  /** How many tasks each dashboard widget lists before "View all". */
  dashboardTaskLimit: number;
  /** How many projects the dashboard project list shows before "View all". */
  dashboardProjectLimit: number;
  fontSize: FontSize;
  fontFamily: FontFamily;
  theme: ThemeSettings;
  /** ISO instant of the last save, or null before the server has answered. */
  updatedAt: string | null;
}

/** The fields PATCH /api/settings accepts; at least one is required. */
export type SettingsChanges = Partial<Omit<UserSettings, 'updatedAt'>>;

/** How the app's text looks: the part of the settings applied to the page. */
export type Appearance = Pick<UserSettings, 'fontSize' | 'fontFamily' | 'theme'>;

/** The server's defaults, also used before the user's settings have loaded. */
export const DEFAULT_SETTINGS: UserSettings = {
  dashboardTaskLimit: 5,
  dashboardProjectLimit: 5,
  fontSize: 'medium',
  fontFamily: 'system',
  theme: {
    mode: 'light',
    preset: 'terracotta',
    colors: {
      primary: '#d9531e',
      secondary: '#d98cf0',
      background: '#fffaf7',
      surface: '#ffffff',
      text: '#1d1714',
      muted: '#6b5b54',
      border: '#3a2f2a',
      success: '#1f7a3d',
      warning: '#9a5b00',
      error: '#b42318',
      info: '#176b87',
    },
  },
  updatedAt: null,
};

export const THEME_PRESETS: readonly {
  id: ThemePresetId;
  mode: ThemeMode;
  label: string;
  colors: ThemeColors;
}[] = [
  {
    id: 'terracotta',
    mode: 'light',
    label: 'Terracotta',
    colors: DEFAULT_SETTINGS.theme.colors,
  },
  {
    id: 'meadow',
    mode: 'light',
    label: 'Meadow',
    colors: {
      primary: '#39724f',
      secondary: '#b4553d',
      background: '#f4f8f2',
      surface: '#ffffff',
      text: '#17251c',
      muted: '#52685a',
      border: '#879b8b',
      success: '#267447',
      warning: '#945b0b',
      error: '#b42332',
      info: '#246b9a',
    },
  },
  {
    id: 'coast',
    mode: 'light',
    label: 'Coast',
    colors: {
      primary: '#176b87',
      secondary: '#c45e44',
      background: '#f1f8fa',
      surface: '#ffffff',
      text: '#15242a',
      muted: '#536970',
      border: '#849ba2',
      success: '#267447',
      warning: '#945b0b',
      error: '#b42332',
      info: '#176b87',
    },
  },
  {
    id: 'midnight',
    mode: 'dark',
    label: 'Midnight',
    colors: {
      primary: '#ff9468',
      secondary: '#bca3ff',
      background: '#17191e',
      surface: '#22252c',
      text: '#f1f2f4',
      muted: '#b1b5bf',
      border: '#515761',
      success: '#6bc58a',
      warning: '#f2bd61',
      error: '#ff8178',
      info: '#75c6e2',
    },
  },
  {
    id: 'forest',
    mode: 'dark',
    label: 'Forest',
    colors: {
      primary: '#8ed0a4',
      secondary: '#e5aa79',
      background: '#17201b',
      surface: '#222e27',
      text: '#eef5ef',
      muted: '#b4c4b8',
      border: '#52675a',
      success: '#8ed0a4',
      warning: '#f2c56f',
      error: '#ff8b82',
      info: '#83c7df',
    },
  },
  {
    id: 'violet',
    mode: 'dark',
    label: 'Violet',
    colors: {
      primary: '#d3a6ff',
      secondary: '#80c9d2',
      background: '#201b27',
      surface: '#2c2535',
      text: '#f5eff9',
      muted: '#c2b5cb',
      border: '#665870',
      success: '#76cf9b',
      warning: '#f1be68',
      error: '#ff8984',
      info: '#80c9d2',
    },
  },
];

export const THEME_COLOR_OPTIONS: readonly { key: keyof ThemeColors; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Muted text' },
  { key: 'border', label: 'Borders' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'error', label: 'Error' },
  { key: 'info', label: 'Info' },
];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function isThemePresetId(value: unknown): value is ThemePresetId {
  return THEME_PRESETS.some((preset) => preset.id === value);
}

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
