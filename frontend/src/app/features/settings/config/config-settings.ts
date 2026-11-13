import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, type FormControl } from '@angular/forms';
import { finalize, startWith } from 'rxjs';
import { SettingsStore } from '../state/settings.store';
import {
  DASHBOARD_LIMIT_MAX,
  DASHBOARD_LIMIT_MIN,
  DEFAULT_SETTINGS,
} from '../types/user-settings.types';

type LimitField = 'dashboardTaskLimit' | 'dashboardProjectLimit';

interface LimitFieldInfo {
  key: LimitField;
  id: string;
  label: string;
  hint: string;
}

/** /settings/config: how many tasks and projects the dashboard lists. */
@Component({
  selector: 'app-config-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './config-settings.html',
  styleUrl: './config-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSettings {
  protected readonly store = inject(SettingsStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly min = DASHBOARD_LIMIT_MIN;
  protected readonly max = DASHBOARD_LIMIT_MAX;
  protected readonly fields: readonly LimitFieldInfo[] = [
    {
      key: 'dashboardTaskLimit',
      id: 'dashboard-task-limit',
      label: 'Tasks per dashboard widget',
      hint: 'Current & Upcoming, Overdue, the Current/Upcoming/Overdue columns and All Tasks.',
    },
    {
      key: 'dashboardProjectLimit',
      id: 'dashboard-project-limit',
      label: 'Projects in the dashboard project list',
      hint: 'The Projects list in the home sidebar.',
    },
  ];

  private readonly limit = [
    Validators.required,
    Validators.min(DASHBOARD_LIMIT_MIN),
    Validators.max(DASHBOARD_LIMIT_MAX),
    Validators.pattern(/^-?\d+$/),
  ];
  protected readonly form = inject(FormBuilder).group({
    dashboardTaskLimit: [this.store.taskLimit() as number | null, this.limit],
    dashboardProjectLimit: [this.store.projectLimit() as number | null, this.limit],
  });
  private readonly value = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );
  private readonly status = toSignal(this.form.statusChanges.pipe(startWith(this.form.status)), {
    initialValue: this.form.status,
  });

  protected readonly saving = signal(false);
  protected readonly saved = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);

  /** Whether the fields differ from what is saved. */
  protected readonly changed = computed(() => {
    const value = this.value();
    const saved = this.store.settings();
    return (
      value.dashboardTaskLimit !== saved.dashboardTaskLimit ||
      value.dashboardProjectLimit !== saved.dashboardProjectLimit
    );
  });
  protected readonly canSave = computed(
    () => this.store.loaded() && this.changed() && this.status() === 'VALID' && !this.saving(),
  );
  protected readonly atDefaults = computed(() => {
    const saved = this.store.settings();
    return (
      saved.dashboardTaskLimit === DEFAULT_SETTINGS.dashboardTaskLimit &&
      saved.dashboardProjectLimit === DEFAULT_SETTINGS.dashboardProjectLimit
    );
  });

  constructor() {
    this.store.load();
    // Fresh settings from the server fill the fields unless the user has started editing.
    effect(() => {
      const { dashboardTaskLimit, dashboardProjectLimit } = this.store.settings();
      untracked(() => {
        if (this.form.pristine) {
          this.form.setValue({ dashboardTaskLimit, dashboardProjectLimit });
        }
      });
    });
  }

  protected control(key: LimitField): FormControl<number | null> {
    return this.form.controls[key];
  }

  /** The validation message for a field, once the user has touched or changed it. */
  protected message(key: LimitField): string | null {
    const control = this.control(key);
    if (control.valid || (control.pristine && control.untouched)) return null;
    if (control.hasError('required')) return 'Enter a number.';
    if (control.hasError('pattern')) return 'Use a whole number.';
    if (control.hasError('min') || control.hasError('max')) {
      return `Choose a number from ${DASHBOARD_LIMIT_MIN} to ${DASHBOARD_LIMIT_MAX}.`;
    }
    return null;
  }

  /** The −/+ buttons: move by one, kept within the allowed range. */
  protected step(key: LimitField, delta: -1 | 1): void {
    const control = this.control(key);
    const current = Number.isFinite(control.value)
      ? Math.round(control.value!)
      : DEFAULT_SETTINGS[key];
    const next = Math.min(DASHBOARD_LIMIT_MAX, Math.max(DASHBOARD_LIMIT_MIN, current + delta));
    control.setValue(next);
    control.markAsDirty();
    control.markAsTouched();
    this.saved.set(null);
  }

  protected canStep(key: LimitField, delta: -1 | 1): boolean {
    const value = this.control(key).value;
    if (value === null || !Number.isFinite(value)) return true;
    return delta < 0 ? value > DASHBOARD_LIMIT_MIN : value < DASHBOARD_LIMIT_MAX;
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (!this.canSave()) return;
    const { dashboardTaskLimit, dashboardProjectLimit } = this.form.getRawValue();
    this.persist({
      dashboardTaskLimit: dashboardTaskLimit!,
      dashboardProjectLimit: dashboardProjectLimit!,
    });
  }

  /** Saves the default limits right away. */
  protected resetToDefaults(): void {
    if (this.saving() || !this.store.loaded()) return;
    this.persist(
      {
        dashboardTaskLimit: DEFAULT_SETTINGS.dashboardTaskLimit,
        dashboardProjectLimit: DEFAULT_SETTINGS.dashboardProjectLimit,
      },
      'Limits reset to the defaults.',
    );
  }

  private persist(
    limits: Record<LimitField, number>,
    successMessage = 'Dashboard limits saved.',
  ): void {
    this.saving.set(true);
    this.saved.set(null);
    this.saveError.set(null);
    this.store
      .save(limits)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (settings) => {
          this.form.reset({
            dashboardTaskLimit: settings.dashboardTaskLimit,
            dashboardProjectLimit: settings.dashboardProjectLimit,
          });
          this.saved.set(successMessage);
        },
        error: () => this.saveError.set("Couldn't save your limits. Please try again."),
      });
  }
}
