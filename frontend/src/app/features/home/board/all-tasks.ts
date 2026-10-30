import { ChangeDetectionStrategy, Component, inject, model } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, type ValidatorFn, Validators } from '@angular/forms';
import { DashboardStore, PRIORITIES, type Priority } from '../dashboard.store';

/** Like Validators.required, but a title of only spaces counts as empty too. */
const notBlank: ValidatorFn = ({ value }) =>
  typeof value === 'string' && !value.trim() ? { required: true } : null;

@Component({
  selector: 'app-all-tasks',
  imports: [ReactiveFormsModule],
  templateUrl: './all-tasks.html',
  styleUrl: './all-tasks.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllTasks {
  protected readonly store = inject(DashboardStore);
  protected readonly priorities = PRIORITIES;

  /** Whether the new-task form is open; the page's "+ New Task" button also sets it. */
  readonly composing = model(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [notBlank, Validators.maxLength(120)]],
    projectId: [''],
    priority: ['medium' as Priority],
    due: [this.store.today(), Validators.required],
  });

  protected create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, projectId, priority, due } = this.form.getRawValue();
    this.store.addTask({
      title: title.trim(),
      projectId: projectId ? Number(projectId) : null,
      priority,
      due,
    });
    this.form.reset({ title: '', projectId, priority: 'medium', due: this.store.today() });
    this.composing.set(false);
  }

  protected shortDate(key: string): string {
    return new Date(`${key}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
