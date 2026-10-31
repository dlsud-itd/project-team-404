import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RECURRENCE_OPTIONS, type TaskRecurrence } from '../../types/task-scheduling.types';
import { recurrenceLabel } from '../../utils/recurrence-label.util';

/** The task form's Repeat choice. The form owns the control and the error message. */
@Component({
  selector: 'app-recurrence-picker',
  imports: [ReactiveFormsModule],
  templateUrl: './recurrence-picker.html',
  styleUrl: './recurrence-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurrencePicker {
  readonly control = input.required<FormControl<TaskRecurrence>>();
  readonly error = input<string | null>(null);
  /** The user changed the choice. */
  readonly edited = output();

  protected readonly options = RECURRENCE_OPTIONS;

  /** "every week", to follow "Repeats"; null for a task that does not repeat. */
  protected label(): string | null {
    return recurrenceLabel(this.control().value)?.toLowerCase() ?? null;
  }
}
