import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/** The task form's due date field. The form owns the control and the error message. */
@Component({
  selector: 'app-due-date-picker',
  imports: [ReactiveFormsModule],
  templateUrl: './due-date-picker.html',
  styleUrl: './due-date-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DueDatePicker {
  /** Holds a YYYY-MM-DD date, or an empty string. */
  readonly control = input.required<FormControl<string>>();
  readonly error = input<string | null>(null);
  /** The user changed the date. */
  readonly edited = output();

  protected clear(): void {
    this.control().setValue('');
    this.control().markAsDirty();
    this.edited.emit();
  }
}
