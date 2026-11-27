import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PrioritiesStore } from '../../state/priorities.store';

/**
 * A compact key for the priority colors: tasks show priority as a tint and a left accent rather
 * than a tag, so this names each color once.
 */
@Component({
  selector: 'app-priority-legend',
  template: `
    <ul class="legend" aria-label="Priority colors">
      @for (item of items(); track item.id) {
        <li class="item" [attr.title]="item.tone.name + ' priority'">
          <span
            class="chip"
            aria-hidden="true"
            [style.--priority-bg]="item.tone.bg"
            [style.--priority-accent]="item.tone.accent"
          ></span>
          {{ item.tone.name }}
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.875rem;
      margin: 0;
      padding: 0;
      list-style: none;
      color: var(--ink-muted);
      font-size: 0.75rem;
    }
    .item {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      white-space: nowrap;
    }
    .chip {
      width: 0.875rem;
      height: 0.625rem;
      border-radius: 2px;
      background: var(--priority-bg);
      box-shadow:
        inset 3px 0 0 var(--priority-accent),
        inset 0 0 0 1px var(--divider);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityLegend {
  private readonly priorities = inject(PrioritiesStore);

  protected readonly items = computed(() =>
    this.priorities.levels().map((level) => ({ id: level.id, tone: this.priorities.toneOf(level.id) })),
  );
}
