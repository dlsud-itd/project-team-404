import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Stands in for a settings tab whose page isn't built yet (Preferences, Config). */
@Component({
  selector: 'app-settings-placeholder',
  template: `
    <h2>{{ heading }}</h2>
    <p>{{ description }}</p>
  `,
  styles: `
    h2 {
      margin: 0 0 0.25rem;
      font-size: 1.5rem;
      font-weight: 800;
    }
    p {
      color: var(--ink-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPlaceholder {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  protected readonly heading = String(this.data['heading'] ?? '');
  protected readonly description = String(this.data['description'] ?? 'Coming soon.');
}
