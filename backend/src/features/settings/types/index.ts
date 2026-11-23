export type ThemeSettings = {
  mode: 'light' | 'dark';
  preset: 'terracotta' | 'meadow' | 'coast' | 'midnight' | 'forest' | 'violet';
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

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
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
};

export type UpdateSettingsInput = Partial<{
  dashboardTaskLimit: number;
  dashboardProjectLimit: number;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  fontFamily:
    'system' | 'sans-serif' | 'serif' | 'monospace' | 'atkinson-hyperlegible';
  theme: ThemeSettings;
}>;
