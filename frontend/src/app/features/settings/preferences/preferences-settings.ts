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
import { SettingsStore } from '../state/settings.store';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  isFontFamily,
  isFontSize,
  type Appearance,
  type FontFamily,
  type FontSize,
} from '../types/user-settings.types';

/**
 * /settings/preferences: text size and font. A choice applies to the whole app at once as a
 * preview; Save keeps it, Cancel (or leaving the page) goes back to the saved look.
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

  protected readonly sizes = FONT_SIZES;
  protected readonly families = FONT_FAMILIES;

  protected readonly fontSize = signal<FontSize>(this.store.settings().fontSize);
  protected readonly fontFamily = signal<FontFamily>(this.store.settings().fontFamily);
  /** Set once the user picks something, so later server data doesn't overwrite the choice. */
  private readonly touched = signal(false);

  protected readonly saving = signal(false);
  protected readonly saved = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);

  protected readonly changed = computed(() => {
    const saved = this.store.settings();
    return this.fontSize() !== saved.fontSize || this.fontFamily() !== saved.fontFamily;
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
      const { fontSize, fontFamily } = this.store.settings();
      untracked(() => {
        if (this.touched()) return;
        this.fontSize.set(fontSize);
        this.fontFamily.set(fontFamily);
      });
    });
    // Leaving without saving drops the preview.
    this.destroyRef.onDestroy(() => this.store.cancelPreview());
  }

  protected pickSize(value: string): void {
    if (isFontSize(value)) this.apply({ fontSize: value, fontFamily: this.fontFamily() });
  }

  protected pickFamily(value: string): void {
    if (isFontFamily(value)) this.apply({ fontSize: this.fontSize(), fontFamily: value });
  }

  protected save(): void {
    if (!this.changed() || this.saving() || !this.store.loaded()) return;
    this.saving.set(true);
    this.saved.set(null);
    this.saveError.set(null);
    this.store
      .save({ fontSize: this.fontSize(), fontFamily: this.fontFamily() })
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.touched.set(false);
          this.saved.set('Preferences saved.');
        },
        error: () => this.saveError.set("Couldn't save your preferences. Please try again."),
      });
  }

  protected cancel(): void {
    const { fontSize, fontFamily } = this.store.settings();
    this.fontSize.set(fontSize);
    this.fontFamily.set(fontFamily);
    this.touched.set(false);
    this.saved.set(null);
    this.saveError.set(null);
    this.store.cancelPreview();
  }

  private apply(appearance: Appearance): void {
    this.touched.set(true);
    this.saved.set(null);
    this.fontSize.set(appearance.fontSize);
    this.fontFamily.set(appearance.fontFamily);
    this.store.previewAppearance(appearance);
  }
}
