import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Chevron button that shows or hides a widget's contents. The parent owns the state and hides
 * the element named by `controls`.
 */
@Component({
  selector: 'app-collapse-toggle',
  template: `
    <button
      type="button"
      class="toggle"
      [attr.aria-expanded]="!collapsed()"
      [attr.aria-controls]="controls()"
      [attr.aria-label]="(collapsed() ? 'Show ' : 'Hide ') + name()"
      [title]="collapsed() ? 'Show' : 'Hide'"
      (click)="toggled.emit()"
    >
      <svg viewBox="0 0 12 12" aria-hidden="true" [class.flipped]="collapsed()">
        <path d="M3 7.5 6 4.5 9 7.5" />
      </svg>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    .toggle {
      display: grid;
      place-items: center;
      width: 1.75rem;
      height: 1.75rem;
      border: 0;
      border-radius: 0.375rem;
      background: none;
      color: var(--ink-muted);
      cursor: pointer;
      &:hover {
        background: var(--hover-bg);
        color: var(--ink);
      }
      &:focus-visible {
        outline: 2px solid var(--theme-primary);
        outline-offset: 2px;
      }
    }
    svg {
      width: 0.75rem;
      height: 0.75rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 150ms ease;
    }
    .flipped {
      transform: rotate(180deg);
    }
    @media (prefers-reduced-motion: reduce) {
      svg {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollapseToggle {
  readonly collapsed = input(false);
  /** Id of the element this button shows and hides. */
  readonly controls = input.required<string>();
  /** What is hidden, for the accessible label: "Hide {name}" / "Show {name}". */
  readonly name = input.required<string>();
  readonly toggled = output<void>();
}
