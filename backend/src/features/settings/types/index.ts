export const LIGHT_THEME_PRESETS = [
  'paper',
  'terracotta',
  'meadow',
  'coast',
] as const;
export const DARK_THEME_PRESETS = [
  'graphite',
  'midnight',
  'forest',
  'violet',
] as const;
export type ThemePresetId =
  | (typeof LIGHT_THEME_PRESETS)[number]
  | (typeof DARK_THEME_PRESETS)[number];

/** How the dashboard orders favorite projects. */
export const DASHBOARD_PROJECT_SORTS = [
  'custom',
  'name-asc',
  'name-desc',
  'recent',
  'created-desc',
  'created-asc',
] as const;
export type DashboardProjectSort = (typeof DASHBOARD_PROJECT_SORTS)[number];

export type ThemeSettings = {
  mode: 'light' | 'dark';
  preset: ThemePresetId;
  colors: {
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
  };
};

/** Paper: a neutral base with one violet accent. New accounts start here. */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'light',
  preset: 'paper',
  colors: {
    primary: '#6941c6',
    secondary: '#73726e',
    background: '#fbfbfa',
    surface: '#ffffff',
    text: '#37352f',
    muted: '#73726e',
    border: '#8f8e8a',
    success: '#2f7d4f',
    warning: '#8a5a00',
    error: '#c4332d',
    info: '#6941c6',
  },
};

export type UpdateSettingsInput = Partial<{
  dashboardTaskLimit: number;
  dashboardProjectLimit: number;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  fontFamily:
    'system' | 'sans-serif' | 'serif' | 'monospace' | 'atkinson-hyperlegible';
  theme: ThemeSettings;
  defaultProjectId: number | null;
  dashboardProjectSort: DashboardProjectSort;
}>;
