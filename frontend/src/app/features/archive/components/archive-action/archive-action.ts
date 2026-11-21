import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { type ArchiveHooks, ArchiveUndoService } from '../../services/archive-undo.service';
import type { ArchiveKind } from '../../types/archive.types';
import { kindNoun } from '../../utils/archive-labels.util';

/**
 * The shared "Archive" / "Restore" control. As a menu item it sits inside an existing menu
 * (`role="menuitem"`); as a button it stands on its own. Archiving shows a 5-second Undo toast,
 * and both directions are optimistic through the hooks the parent passes in.
 *
 * Renders nothing when `hidden` is set, e.g. for the Inbox, which can't be archived.
 */
@Component({
  selector: 'app-archive-action',
  template: `
    @if (!hidden()) {
      <button
        type="button"
        [class]="buttonClass()"
        [attr.role]="variant() === 'menuitem' ? 'menuitem' : null"
        [attr.aria-label]="ariaLabel()"
        [disabled]="disabled()"
        (click)="run($event)"
      >
        @if (variant() === 'menuitem') {
          {{ label() }}
        } @else if (variant() === 'button') {
          <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">
            @if (archived()) {
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            } @else {
              <rect x="3" y="4" width="18" height="5" rx="1" />
              <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" />
            }
          </svg>
          <span>{{ label() }}</span>
        } @else {
          <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="5" rx="1" />
            <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" />
          </svg>
        }
      </button>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font: inherit;
      color: inherit;
      cursor: pointer;
      &:disabled {
        cursor: progress;
        opacity: 0.6;
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 2px;
      }
    }
    .glyph {
      display: var(--archive-action-glyph, inline-block);
      width: 1rem;
      height: 1rem;
      flex: none;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    /* Hosts can match their own menu items through these custom properties. */
    .menu-item {
      display: block;
      width: 100%;
      padding: var(--archive-action-padding, 0.5rem 0.75rem);
      border: 0;
      border-radius: 0.25rem;
      background: none;
      color: var(--ink);
      font-size: var(--archive-action-font-size, inherit);
      text-align: left;
      &:hover {
        background: var(--archive-action-hover, var(--cream));
      }
    }
    .archive-button {
      padding: var(--archive-action-padding, 0.375rem 0.75rem);
      border: 1px solid var(--field-border);
      border-radius: 999px;
      background: #fff;
      font-size: var(--archive-action-font-size, 0.875rem);
      font-weight: 600;
      &:hover {
        background: var(--cream);
      }
    }
    .icon-only {
      --archive-action-glyph: inline-block;
      padding: 0.375rem;
      border-color: transparent;
      background: none;
      color: var(--ink-muted);
      &:hover {
        color: var(--ink);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchiveAction {
  private readonly undo = inject(ArchiveUndoService);

  readonly kind = input.required<ArchiveKind>();
  readonly itemId = input.required<number>();
  readonly name = input.required<string>();
  /** True shows "Restore"; false shows "Archive". */
  readonly archived = input(false);
  /** `menuitem` inside a menu, `button` with a label, `icon` for a compact row. */
  readonly variant = input<'menuitem' | 'button' | 'icon'>('button');
  readonly hidden = input(false);
  readonly disabled = input(false);
  /**
   * How the parent's own list shows the change at once, and undoes it on failure. In a list,
   * pass a stable function (e.g. an arrow-function field) that builds the hooks for an id.
   */
  readonly hooks = input<ArchiveHooks | ((id: number) => ArchiveHooks)>({});

  /** Fires as soon as the user picks the action, before the server answers. */
  readonly changed = output<boolean>();

  protected readonly buttonClass = computed(() => {
    const variant = this.variant();
    if (variant === 'menuitem') return 'menu-item';
    return variant === 'icon' ? 'archive-button icon-only' : 'archive-button';
  });
  protected readonly label = computed(() => (this.archived() ? 'Restore' : 'Archive'));
  protected readonly ariaLabel = computed(
    () => `${this.label()} ${kindNoun(this.kind()).toLowerCase()} ${this.name()}`,
  );

  protected run(event: Event): void {
    event.stopPropagation();
    const target = { kind: this.kind(), id: this.itemId(), name: this.name() };
    const archiving = !this.archived();
    const given = this.hooks();
    const hooks = typeof given === 'function' ? given(target.id) : given;
    this.changed.emit(archiving);
    if (archiving) this.undo.archive(target, hooks);
    else this.undo.restore(target, { ...hooks, announce: true });
  }
}
