import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ToastOutlet } from '../../../../shared/components/toast-outlet/toast-outlet';

export interface SettingsTab {
  path: string;
  label: string;
}

export const SETTINGS_TABS: readonly SettingsTab[] = [
  { path: 'profile', label: 'Profile' },
  { path: 'preferences', label: 'Preferences' },
  { path: 'config', label: 'Config' },
  { path: 'labels', label: 'Labels' },
  { path: 'priorities', label: 'Priorities' },
];

/** The /settings frame: side tabs (a select on small screens) around the open settings page. */
@Component({
  selector: 'app-settings-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastOutlet],
  template: `
    <div class="settings">
      <header class="head">
        <h1>Settings</h1>
      </header>

      <label class="picker">
        <span class="visually-hidden">Settings section</span>
        <select #picker (change)="go(picker.value)">
          @for (tab of tabs; track tab.path) {
            <option [value]="tab.path" [selected]="activeTab() === tab.path">
              {{ tab.label }}
            </option>
          }
        </select>
      </label>

      <nav class="tabs" aria-label="Settings sections">
        @for (tab of tabs; track tab.path) {
          <a
            class="tab"
            [routerLink]="['/settings', tab.path]"
            routerLinkActive="active"
            ariaCurrentWhenActive="page"
            >{{ tab.label }}</a
          >
        }
      </nav>

      <section class="content">
        <router-outlet />
      </section>
    </div>
    <app-toast-outlet />
  `,
  styles: `
    :host {
      display: block;
    }
    .settings {
      display: grid;
      grid-template-columns: 12rem minmax(0, 1fr);
      grid-template-areas:
        'head head'
        'tabs content';
      gap: 1.5rem 2rem;
      max-width: 64rem;
      margin: 0 auto;
      padding: 2rem 1rem 4rem;
    }
    .head {
      grid-area: head;
    }
    h1 {
      margin: 0;
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 800;
    }
    .tabs {
      grid-area: tabs;
      display: flex;
      flex-direction: column;
      align-self: start;
      gap: 0.25rem;
    }
    .tab {
      padding: 0.5rem 0.75rem;
      border-left: 3px solid transparent;
      border-radius: 0 0.375rem 0.375rem 0;
      color: var(--ink);
      font-weight: 600;
      text-decoration: none;
      &:hover {
        background: var(--cream);
      }
      &.active {
        border-left-color: var(--orange);
        background: var(--cream);
        color: var(--brown);
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 2px;
      }
    }
    .picker {
      display: none;
    }
    .picker select {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--field-border);
      border-radius: 0.5rem;
      background: #fff;
      font: inherit;
      font-weight: 600;
    }
    .content {
      grid-area: content;
      min-width: 0;
    }
    /* The profile page brings its own centered column; inside the frame it fills the space. */
    .content ::ng-deep app-profile-settings .page {
      max-width: 36rem;
      margin: 0;
      padding: 0;
    }
    @media (max-width: 48rem) {
      .settings {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
          'head'
          'picker'
          'content';
        gap: 1rem;
      }
      .tabs {
        display: none;
      }
      .picker {
        grid-area: picker;
        display: block;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsLayout {
  private readonly router = inject(Router);
  protected readonly tabs = SETTINGS_TABS;

  /** The tab whose page is open, read from the URL. */
  protected readonly activeTab = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => tabFromUrl(this.router.url)),
    ),
    { initialValue: tabFromUrl(this.router.url) },
  );

  protected go(path: string): void {
    if (SETTINGS_TABS.some((tab) => tab.path === path)) {
      void this.router.navigate(['/settings', path]);
    }
  }
}

function tabFromUrl(url: string): string {
  const segment = url.split(/[?#]/)[0].split('/')[2] ?? '';
  return SETTINGS_TABS.some((tab) => tab.path === segment) ? segment : 'profile';
}
