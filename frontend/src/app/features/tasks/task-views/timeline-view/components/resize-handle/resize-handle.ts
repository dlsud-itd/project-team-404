import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

/** A key press on the handle: one step narrower (-1) or wider (1), or straight to a limit. */
export type ResizeStep = -1 | 1 | 'min' | 'max';

/**
 * A vertical splitter on a column's right edge. It only reports movement; the parent owns the
 * width and its limits.
 *
 * Pointer: drag (mouse, pen or touch) reports how far the pointer has moved since the drag
 * began. Keyboard: Arrow Left/Right step, Home/End go to the limits, Enter resets.
 * Double-click also resets.
 */
@Component({
  selector: 'app-resize-handle',
  template: '',
  styleUrl: './resize-handle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'separator',
    'aria-orientation': 'vertical',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuetext]': 'value() === null ? emptyText() : value() + " pixels"',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    '[attr.tabindex]': 'focusable() ? 0 : null',
    '[attr.aria-hidden]': 'focusable() ? null : true',
    '[class.dragging]': 'dragging()',
    '(pointerdown)': 'down($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'up($event)',
    '(pointercancel)': 'up($event)',
    '(keydown)': 'key($event)',
    '(dblclick)': 'reset.emit()',
  },
})
export class ResizeHandle {
  readonly label = input.required<string>();
  /** The current width in pixels, or null while it is the default. */
  readonly value = input<number | null>(null);
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  /** Read out while the value is the default. */
  readonly emptyText = input('Default width');
  /**
   * Whether this handle is a Tab stop. Several handles that do the same job (one per row) only
   * need one stop; the rest are for the pointer and are hidden from screen readers.
   */
  readonly focusable = input(true);

  readonly resizeStart = output<void>();
  /** Pixels moved since the drag began; negative is to the left. */
  readonly resizeBy = output<number>();
  readonly resizeEnd = output<void>();
  readonly resizeStep = output<ResizeStep>();
  readonly reset = output<void>();

  protected readonly dragging = signal(false);
  private startX = 0;

  protected down(event: PointerEvent): void {
    if (event.button !== 0) return;
    // Stops text selection, and on touch screens stops the page scrolling instead.
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture?.(event.pointerId);
    this.startX = event.clientX;
    this.dragging.set(true);
    this.resizeStart.emit();
  }

  protected move(event: PointerEvent): void {
    if (this.dragging()) this.resizeBy.emit(event.clientX - this.startX);
  }

  protected up(event: PointerEvent): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.resizeEnd.emit();
  }

  protected key(event: KeyboardEvent): void {
    const steps: Record<string, ResizeStep> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      Home: 'min',
      End: 'max',
    };
    if (event.key in steps) this.resizeStep.emit(steps[event.key]);
    else if (event.key === 'Enter') this.reset.emit();
    else return;
    event.preventDefault();
  }
}
