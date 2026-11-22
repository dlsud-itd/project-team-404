import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { PriorityLevel } from '../../types/settings.types';
import { taskCountLabel } from '../../utils/reorder.util';

/**
 * Confirms deleting a priority level and asks which level its tasks move to. Choosing one is
 * required when tasks use the level (or the count is unknown); the last level can't be deleted.
 */
@Component({
  selector: 'app-delete-priority-dialog',
  template: `
    <div class="backdrop" (click)="cancelled.emit()"></div>
    <section
      class="dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-priority-title"
      aria-describedby="delete-priority-impact"
      (keydown.escape)="cancelled.emit()"
    >
      <h3 id="delete-priority-title">Delete “{{ level().name }}”?</h3>
      @if (!others().length) {
        <p id="delete-priority-impact">
          This is your only priority level. Add another level before deleting this one.
        </p>
      } @else {
        <p id="delete-priority-impact">{{ impact() }}</p>
        @if (needsTarget()) {
          <label class="field" for="reassign-priority">
            Move its tasks to
            <select
              #targetSelect
              id="reassign-priority"
              required
              [attr.aria-invalid]="showRequired()"
              aria-describedby="reassign-priority-status"
              (change)="pick(targetSelect.value)"
            >
              <option value="" [selected]="target() === null">Choose a level…</option>
              @for (option of others(); track option.id) {
                <option [value]="option.id" [selected]="target() === option.id">
                  {{ option.name }}{{ option.isDefault ? ' (default)' : '' }}
                </option>
              }
            </select>
          </label>
          <p id="reassign-priority-status" class="dialog-error" aria-live="polite">
            {{ showRequired() ? 'Choose where its tasks go.' : '' }}
          </p>
        }
        @if (level().isDefault) {
          <p class="note">
            It's your default level, so
            {{ needsTarget() ? 'the level you choose' : defaultTargetName() }}
            becomes the default.
          </p>
        }
      }
      @if (error(); as message) {
        <p class="dialog-error" role="alert">{{ message }}</p>
      }
      <div class="dialog-actions">
        <button
          #cancelButton
          type="button"
          class="action"
          [disabled]="busy()"
          (click)="cancelled.emit()"
        >
          Cancel
        </button>
        @if (others().length) {
          <button type="button" class="action danger" [disabled]="busy()" (click)="confirm()">
            {{ busy() ? 'Deleting…' : 'Delete level' }}
          </button>
        }
      </div>
    </section>
  `,
  styleUrl: '../../components/settings-list.scss',
  styles: `
    .field {
      display: grid;
      gap: 0.375rem;
      font-weight: 600;
    }
    select {
      padding: 0.5rem;
      border: 1px solid var(--field-border);
      border-radius: 0.375rem;
      font: inherit;
      font-weight: 400;
      &[aria-invalid='true'] {
        border-color: var(--error);
      }
    }
    .dialog .note {
      color: var(--ink-muted);
      font-size: 0.875rem;
    }
    #reassign-priority-status {
      min-height: 1rem;
      margin: 0.25rem 0 0.75rem;
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletePriorityDialog {
  readonly level = input.required<PriorityLevel>();
  /** Every level, in order; the one being deleted is left out of the choices. */
  readonly levels = input.required<readonly PriorityLevel[]>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  /** The level id its tasks move to, or null when none need to move. */
  readonly confirmed = output<number | null>();
  readonly cancelled = output<void>();

  protected readonly target = signal<number | null>(null);
  private readonly attempted = signal(false);
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  protected readonly others = computed(() =>
    this.levels().filter((level) => level.id !== this.level().id),
  );
  /** Tasks have to go somewhere unless the server says there are none. */
  protected readonly needsTarget = computed(() => this.level().taskCount !== 0);
  protected readonly showRequired = computed(
    () => this.attempted() && this.needsTarget() && this.target() === null,
  );
  protected readonly impact = computed(() => {
    const count = this.level().taskCount;
    if (count === 0) return 'No tasks use this level.';
    if (count === null) return 'Tasks on this level need a new one.';
    return `${taskCountLabel(count)} use this level and will move to the level you choose.`;
  });
  /** With no tasks to move, the server makes the first remaining level the default. */
  protected readonly defaultTargetName = computed(() => this.others()[0]?.name ?? '');

  constructor() {
    afterNextRender(() => this.cancelButton()?.nativeElement.focus());
  }

  protected pick(value: string): void {
    const id = Number(value);
    this.target.set(Number.isInteger(id) && id > 0 ? id : null);
  }

  protected confirm(): void {
    if (this.busy() || !this.others().length) return;
    this.attempted.set(true);
    if (!this.needsTarget()) {
      // Deleting the default still needs a level to take over that flag.
      this.confirmed.emit(this.level().isDefault ? (this.others()[0]?.id ?? null) : null);
      return;
    }
    const target = this.target();
    if (target === null) return;
    this.confirmed.emit(target);
  }
}
