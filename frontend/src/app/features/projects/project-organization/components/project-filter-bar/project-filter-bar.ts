import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { activeProjectFilterCount, type ProjectQuery } from '../../utils/project-query-params.util';

/**
 * Favorites and Archived toggle chips and a Color chip with a small panel of color radios.
 * The bar only reports changes; the project list writes them to the URL.
 */
@Component({
  selector: 'app-project-filter-bar',
  templateUrl: './project-filter-bar.html',
  styleUrl: './project-filter-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeIfOutside($event)',
  },
})
export class ProjectFilterBar {
  readonly query = input.required<ProjectQuery>();
  /** The colors the user's projects use, #RRGGBB. */
  readonly colors = input<readonly string[]>([]);
  readonly changed = output<Partial<ProjectQuery>>();
  readonly cleared = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly colorOpen = signal(false);
  protected readonly count = computed(() => activeProjectFilterCount(this.query()));
  protected readonly announcement = computed(() => {
    const count = this.count();
    if (count === 0) return 'No filters applied';
    return `${count} ${count === 1 ? 'filter' : 'filters'} applied`;
  });

  protected toggleFavorites(): void {
    this.changed.emit({ favorites: !this.query().favorites });
  }

  protected toggleArchived(): void {
    this.changed.emit({ archived: !this.query().archived });
  }

  protected setColor(color: string | null): void {
    this.changed.emit({ color });
  }

  protected closeAndFocus(chip: HTMLElement): void {
    if (!this.colorOpen()) return;
    this.colorOpen.set(false);
    chip.focus();
  }

  protected onFocusOut(event: FocusEvent, wrap: HTMLElement): void {
    const next = event.relatedTarget;
    if (next instanceof Node && !wrap.contains(next)) this.colorOpen.set(false);
  }

  /** A click anywhere outside the bar closes the panel; clicks inside are handled there. */
  protected closeIfOutside(event: Event): void {
    if (!this.colorOpen()) return;
    if (event.target instanceof Node && this.host.nativeElement.contains(event.target)) return;
    this.colorOpen.set(false);
  }

  protected clear(): void {
    this.colorOpen.set(false);
    this.cleared.emit();
  }
}
