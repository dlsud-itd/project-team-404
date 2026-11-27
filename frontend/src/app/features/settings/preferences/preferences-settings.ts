import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import { settingsSaveError } from '../services/settings.service';
import { SettingsStore } from '../state/settings.store';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  isFontFamily,
  isFontSize,
  isThemeMode,
  THEME_COLOR_OPTIONS,
  THEME_PRESETS,
  type FontFamily,
  type FontSize,
  type ThemeColors,
  type ThemeMode,
  type ThemePresetId,
} from '../types/user-settings.types';

/**
 * /settings/preferences: appearance choices preview across the app; Save keeps them and Cancel
 * (or leaving the page) restores the saved appearance.
 */
@Component({
  selector: 'app-preferences-settings',
  templateUrl: './preferences-settings.html',
  styleUrl: './preferences-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferencesSettings {
  protected readonly store = inject(SettingsStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  protected readonly sizes = FONT_SIZES;
  protected readonly families = FONT_FAMILIES;
  protected readonly themeColors = THEME_COLOR_OPTIONS;
  protected readonly themeModes: readonly { value: ThemeMode; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  protected readonly fontSize = signal<FontSize>(this.store.settings().fontSize);
  protected readonly fontFamily = signal<FontFamily>(this.store.settings().fontFamily);
  protected readonly themeMode = signal<ThemeMode>(this.store.settings().theme.mode);
  protected readonly themePreset = signal<ThemePresetId>(this.store.settings().theme.preset);
  protected readonly colors = signal<ThemeColors>(this.store.settings().theme.colors);
  protected readonly presets = computed(() =>
    THEME_PRESETS.filter((preset) => preset.mode === this.themeMode()),
  );
  private readonly touched = signal(false);

  protected readonly saving = signal(false);
  protected readonly saved = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);

  protected readonly changed = computed(() => {
    const saved = this.store.settings();
    return (
      this.fontSize() !== saved.fontSize ||
      this.fontFamily() !== saved.fontFamily ||
      this.themeMode() !== saved.theme.mode ||
      this.themePreset() !== saved.theme.preset ||
      THEME_COLOR_OPTIONS.some(({ key }) => this.colors()[key] !== saved.theme.colors[key])
    );
  });
  protected readonly previewFamily = computed(
    () => FONT_FAMILIES.find((family) => family.value === this.fontFamily())!.css,
  );
  protected readonly previewSize = computed(
    () => FONT_SIZES.find((size) => size.value === this.fontSize())!.label,
  );

  constructor() {
    this.store.load();
    effect(() => {
      const { fontSize, fontFamily, theme } = this.store.settings();
      untracked(() => {
        if (this.touched()) return;
        this.fontSize.set(fontSize);
        this.fontFamily.set(fontFamily);
        this.themeMode.set(theme.mode);
        this.themePreset.set(theme.preset);
        this.colors.set(theme.colors);
      });
    });
    this.destroyRef.onDestroy(() => this.store.cancelPreview());
  }

  protected pickSize(value: string): void {
    if (!isFontSize(value)) return;
    this.fontSize.set(value);
    this.applyCurrentAppearance();
  }

  protected pickFamily(value: string): void {
    if (!isFontFamily(value)) return;
    this.fontFamily.set(value);
    this.applyCurrentAppearance();
  }

  protected pickThemeMode(value: string): void {
    if (!isThemeMode(value)) return;
    const preset = THEME_PRESETS.find((item) => item.mode === value)!;
    this.themeMode.set(value);
    this.themePreset.set(preset.id);
    this.colors.set(preset.colors);
    this.applyCurrentAppearance();
  }

  protected pickThemePreset(value: string): void {
    const preset = this.presets().find((item) => item.id === value);
    if (!preset) return;
    this.themePreset.set(preset.id);
    this.colors.set(preset.colors);
    this.applyCurrentAppearance();
  }

  protected pickColor(key: keyof ThemeColors, value: string): void {
    if (!/^#[\da-f]{6}$/i.test(value)) return;
    this.colors.update((colors) => ({ ...colors, [key]: value }));
    this.applyCurrentAppearance();
  }

  protected save(): void {
    if (!this.changed() || this.saving() || !this.store.loaded()) return;
    this.saving.set(true);
    this.saved.set(null);
    this.saveError.set(null);
    this.store
      .save({
        fontSize: this.fontSize(),
        fontFamily: this.fontFamily(),
        theme: { mode: this.themeMode(), preset: this.themePreset(), colors: this.colors() },
      })
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.touched.set(false);
          this.saved.set('Preferences saved.');
          this.toast.neutral('Preferences saved');
        },
        error: (error: unknown) =>
          this.saveError.set(
            settingsSaveError(error, "Couldn't save your preferences. Please try again."),
          ),
      });
  }

  protected cancel(): void {
    const { fontSize, fontFamily, theme } = this.store.settings();
    this.fontSize.set(fontSize);
    this.fontFamily.set(fontFamily);
    this.themeMode.set(theme.mode);
    this.themePreset.set(theme.preset);
    this.colors.set(theme.colors);
    this.touched.set(false);
    this.saved.set(null);
    this.saveError.set(null);
    this.store.cancelPreview();
  }

  private applyCurrentAppearance(): void {
    this.touched.set(true);
    this.saved.set(null);
    this.store.previewAppearance({
      fontSize: this.fontSize(),
      fontFamily: this.fontFamily(),
      theme: { mode: this.themeMode(), preset: this.themePreset(), colors: this.colors() },
    });
  }
}
