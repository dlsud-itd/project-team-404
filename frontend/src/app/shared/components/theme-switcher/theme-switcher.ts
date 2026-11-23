import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  THEME_PRESETS,
  type ThemeMode,
} from '../../../features/settings/types/user-settings.types';

export const PUBLIC_THEME_STORAGE_KEY = 'habitflow-public-theme';

@Component({
  selector: 'app-theme-switcher',
  template: `
    <button
      type="button"
      class="theme-switcher"
      (click)="toggle()"
      [attr.aria-label]="mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
      [attr.title]="mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
    >
      @if (mode() === 'dark') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4"></circle>
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
          ></path>
        </svg>
      } @else {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"></path>
        </svg>
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .theme-switcher {
      display: grid;
      width: 2.25rem;
      height: 2.25rem;
      flex: 0 0 auto;
      place-items: center;
      padding: 0;
      border: 1px solid var(--field-border);
      border-radius: 50%;
      background: var(--theme-surface);
      color: var(--theme-text);
      cursor: pointer;
    }

    .theme-switcher:hover {
      background: color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface));
    }

    .theme-switcher:focus-visible {
      outline: 2px solid var(--theme-primary);
      outline-offset: 2px;
    }

    svg {
      width: 1.125rem;
      height: 1.125rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSwitcher {
  private readonly document = inject(DOCUMENT);
  private readonly media =
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? null
      : window.matchMedia('(prefers-color-scheme: dark)');

  protected readonly mode = signal<ThemeMode>(this.initialMode());

  constructor() {
    this.apply(this.mode());

    this.media?.addEventListener('change', (event) => {
      if (this.hasManualChoice()) return;
      this.mode.set(event.matches ? 'dark' : 'light');
      this.apply(this.mode());
    });
  }

  protected toggle(): void {
    const next: ThemeMode = this.mode() === 'dark' ? 'light' : 'dark';
    this.mode.set(next);
    this.apply(next);

    try {
      localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable; the in-page switch still works.
    }
  }

  private initialMode(): ThemeMode {
    try {
      const saved = localStorage.getItem(PUBLIC_THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // Fall through to the device preference.
    }

    const documentMode = this.document.documentElement.getAttribute('data-theme');
    if (documentMode === 'light' || documentMode === 'dark') return documentMode;
    return this.media?.matches ? 'dark' : 'light';
  }

  private hasManualChoice(): boolean {
    try {
      const saved = localStorage.getItem(PUBLIC_THEME_STORAGE_KEY);
      return saved === 'light' || saved === 'dark';
    } catch {
      return false;
    }
  }

  private apply(mode: ThemeMode): void {
    const preset = THEME_PRESETS.find(
      (item) => item.mode === mode && item.id === (mode === 'dark' ? 'midnight' : 'terracotta'),
    );
    if (!preset) return;

    const root = this.document.documentElement;
    root.setAttribute('data-theme', mode);
    for (const [key, value] of Object.entries(preset.colors)) {
      root.style.setProperty(`--theme-${key}`, value);
    }
  }
}
