import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/** The task form's deadline field. The form owns the control and the error message. */
@Component({
  selector: 'app-deadline-picker',
  imports: [ReactiveFormsModule],
  templateUrl: './deadline-picker.html',
  styleUrl: './deadline-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeadlinePicker {
  /** Holds a YYYY-MM-DD date, or an empty string. */
  readonly control = input.required<FormControl<string>>();
  /** The earliest date the calendar offers. */
  readonly dueDate = input('');
  readonly error = input<string | null>(null);
  /** The user changed the date. */
  readonly edited = output();

  protected clear(): void {
    this.control().setValue('');
    this.control().markAsDirty();
    this.edited.emit();
  }
}
