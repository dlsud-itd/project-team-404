import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { merge } from 'rxjs';
import {
  RECURRENCE_ENDS_OPTIONS,
  RECURRENCE_OPTIONS,
  WEEKDAYS,
  type RecurrenceEnds,
  type TaskRecurrence,
  type Weekday,
} from '../../types/task-scheduling.types';
import { recurrenceSummary } from '../../utils/recurrence-label.util';

/**
 * The task form's Repeat choice: how often, which weekdays for a weekly repeat, and when it
 * ends. The form owns the controls and the error messages.
 */
@Component({
  selector: 'app-recurrence-picker',
  imports: [ReactiveFormsModule],
  templateUrl: './recurrence-picker.html',
  styleUrl: './recurrence-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurrencePicker {
  readonly control = input.required<FormControl<TaskRecurrence>>();
  readonly days = input.required<FormControl<Weekday[]>>();
  readonly ends = input.required<FormControl<RecurrenceEnds>>();
  readonly endDate = input.required<FormControl<string>>();
  /** YYYY-MM-DD; the first weekday to offer, and the earliest end date. */
  readonly dueDate = input<string>('');
  readonly error = input<string | null>(null);
  readonly daysError = input<string | null>(null);
  readonly endDateError = input<string | null>(null);
  /** The user changed part of the rule. */
  readonly edited = output();

  protected readonly options = RECURRENCE_OPTIONS;
  protected readonly weekdays = WEEKDAYS;
  protected readonly endsOptions = RECURRENCE_ENDS_OPTIONS;

  constructor() {
    // The form can change these controls too, e.g. when it loads a task; keep the view in step.
    const changes = inject(ChangeDetectorRef);
    effect((onCleanup) => {
      const subscription = merge(
        this.control().valueChanges,
        this.days().valueChanges,
        this.ends().valueChanges,
        this.endDate().valueChanges,
      ).subscribe(() => changes.markForCheck());
      onCleanup(() => subscription.unsubscribe());
    });
  }

  /** "every week on Mon and Thu", to follow "Repeats"; null for a task that does not repeat. */
  protected label(): string | null {
    const ends = this.ends().value === 'date' ? this.endDate().value || null : null;
    const summary = recurrenceSummary(this.control().value, this.days().value, ends);
    return summary ? summary.charAt(0).toLowerCase() + summary.slice(1) : null;
  }

  protected hasDay(day: Weekday): boolean {
    return this.days().value.includes(day);
  }

  /** A new weekly repeat starts on the due date's weekday, so it is never left without a day. */
  protected chose(): void {
    const days = this.days();
    if (this.control().value === 'weekly' && !days.value.length) {
      days.setValue([this.startDay()]);
    }
    this.edited.emit();
  }

  protected toggleDay(day: Weekday, checked: boolean): void {
    const days = this.days();
    const others = days.value.filter((d) => d !== day);
    days.setValue(checked ? [...others, day].sort((a, b) => a - b) : others);
    days.markAsDirty();
    days.markAsTouched();
    this.edited.emit();
  }

  /** The due date's weekday, or today's when there is no due date yet. */
  private startDay(): Weekday {
    const due = this.dueDate();
    if (due) {
      const [year, month, day] = due.split('-').map(Number);
      return new Date(year, month - 1, day).getDay() as Weekday;
    }
    return new Date().getDay() as Weekday;
  }
}
