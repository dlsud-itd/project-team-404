export type UpdateSettingsInput = Partial<{
  dashboardTaskLimit: number;
  dashboardProjectLimit: number;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  fontFamily:
    'system' | 'sans-serif' | 'serif' | 'monospace' | 'atkinson-hyperlegible';
}>;
