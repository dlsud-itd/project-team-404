import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  type OnInit,
} from '@angular/core';
import { SETTING_NAME_MAX_LENGTH, type NameAndColor } from '../../types/settings.types';

/**
 * The inline form that creates or edits a label or priority level: a name, checked live against
 * the names already taken, and a color.
 */
@Component({
  selector: 'app-name-color-editor',
  template: `
    <form class="editor" (submit)="submit($event)" novalidate>
      <label class="visually-hidden" [for]="idPrefix() + '-name'">{{ kind() }} name</label>
      <input
        #nameInput
        class="name"
        [id]="idPrefix() + '-name'"
        [value]="name()"
        [maxLength]="maxLength"
        [placeholder]="placeholder()"
        autocomplete="off"
        [attr.aria-invalid]="!!problem()"
        [attr.aria-describedby]="idPrefix() + '-status'"
        (input)="name.set(nameInput.value)"
        (keydown.escape)="cancelled.emit()"
      />
      <label class="visually-hidden" [for]="idPrefix() + '-color'">{{ kind() }} color</label>
      <input
        #colorInput
        class="color"
        type="color"
        [id]="idPrefix() + '-color'"
        [value]="color()"
        (input)="color.set(colorInput.value)"
      />
      <button type="submit" class="save" [disabled]="busy() || !canSave()">
        {{ busy() ? 'Saving…' : submitLabel() }}
      </button>
      @if (showCancel()) {
        <button type="button" class="cancel" [disabled]="busy()" (click)="cancelled.emit()">
          Cancel
        </button>
      }
      <p class="status" [id]="idPrefix() + '-status'" aria-live="polite">
        {{ problem() ?? serverError() ?? '' }}
      </p>
    </form>
  `,
  styles: `
    .editor {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
    }
    .name {
      flex: 1 1 10rem;
      min-width: 0;
      padding: 0.5rem 0.625rem;
      border: 1px solid var(--field-border);
      border-radius: 0.375rem;
      font: inherit;
      &[aria-invalid='true'] {
        border-color: var(--error);
      }
    }
    .color {
      width: 2.5rem;
      height: 2.25rem;
      padding: 0.125rem;
      border: 1px solid var(--field-border);
      border-radius: 0.375rem;
      background: #fff;
      cursor: pointer;
    }
    button {
      padding: 0.5rem 0.875rem;
      border: 1px solid var(--ink);
      border-radius: 0.375rem;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }
    .save {
      background: var(--ink);
      color: #fff;
    }
    .cancel {
      background: #fff;
      color: var(--ink);
    }
    input:focus-visible,
    button:focus-visible {
      outline: 2px solid #7b23a8;
      outline-offset: 2px;
    }
    .status {
      flex-basis: 100%;
      min-height: 1.125rem;
      margin: 0;
      color: var(--error);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NameColorEditor implements OnInit {
  /** Makes the input ids unique on the page. */
  readonly idPrefix = input.required<string>();
  /** "Label" or "Priority", for the hidden field labels and messages. */
  readonly kind = input('Label');
  readonly initialName = input('');
  readonly initialColor = input<string | null>(null);
  readonly defaultColor = input('#54A6A1');
  /** Names already in use, compared without case or surrounding spaces. */
  readonly takenNames = input<readonly string[]>([]);
  readonly submitLabel = input('Save');
  readonly placeholder = input('');
  readonly showCancel = input(true);
  readonly autofocus = input(false);
  readonly busy = input(false);
  readonly serverError = input<string | null>(null);

  readonly saved = output<NameAndColor>();
  readonly cancelled = output<void>();

  protected readonly maxLength = SETTING_NAME_MAX_LENGTH;
  protected readonly name = signal('');
  protected readonly color = signal('');
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  private readonly taken = computed(
    () => new Set(this.takenNames().map((name) => name.trim().toLocaleLowerCase())),
  );
  /** Why the name can't be saved, shown as the user types. Blank names just disable saving. */
  protected readonly problem = computed(() => {
    const name = this.name().trim();
    if (name && this.taken().has(name.toLocaleLowerCase())) {
      return `${this.kind()} “${name}” already exists.`;
    }
    return null;
  });
  protected readonly canSave = computed(() => !!this.name().trim() && !this.problem());

  ngOnInit(): void {
    this.reset();
    if (this.autofocus()) queueMicrotask(() => this.nameInput().nativeElement.focus());
  }

  /** Back to the starting name and color, e.g. after a create succeeds. */
  reset(): void {
    this.name.set(this.initialName());
    this.color.set(this.initialColor() ?? this.defaultColor());
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.busy() || !this.canSave()) return;
    this.saved.emit({ name: this.name().trim(), color: this.color().toUpperCase() });
  }
}
