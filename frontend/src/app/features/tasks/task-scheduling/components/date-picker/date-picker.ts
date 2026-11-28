import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * One of the task form's date fields: the start date or the end date. The form owns the control
 * and the error message.
 */
@Component({
  selector: 'app-date-picker',
  imports: [ReactiveFormsModule],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePicker {
  /** Holds a YYYY-MM-DD date, or an empty string. */
  readonly control = input.required<FormControl<string>>();
  /** The input's id; its status message uses `<fieldId>-status`. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  /** YYYY-MM-DD; the browser's picker won't offer earlier days. */
  readonly min = input<string | null>(null);
  readonly error = input<string | null>(null);
  /** The user changed the date. */
  readonly edited = output();

  protected clear(): void {
    this.control().setValue('');
    this.control().markAsDirty();
    this.edited.emit();
  }
}
