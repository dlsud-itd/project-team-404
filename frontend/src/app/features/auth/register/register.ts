import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  WritableSignal,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AsyncValidatorFn,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, catchError, finalize, map, of, switchMap, timer } from 'rxjs';
import { usernameFormatValidator } from '../../../shared/validators/username-format.validator';
import { AuthService, AvailabilityResponse } from '../auth.service';

export const DEFAULT_TIMEZONE = 'Asia/Manila';
export const AVAILABILITY_DEBOUNCE_MS = 400;

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'unknown';
type FieldName = 'username' | 'email' | 'password' | 'confirmPassword';
type ApiErrorBody = { error?: string; details?: { field: string; message: string }[] };

const passwordsMatch: ValidatorFn = (group) => {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
};

export function listTimezones(): string[] {
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return zones.includes(DEFAULT_TIMEZONE) ? zones : [DEFAULT_TIMEZONE, ...zones];
}

function apiErrorMessage(error: HttpErrorResponse): string | undefined {
  return (error.error as ApiErrorBody | null)?.error;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly timezones = listTimezones();
  protected readonly usernameAvailability = signal<Availability>('idle');
  protected readonly emailAvailability = signal<Availability>('idle');
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly registered = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      username: [
        '',
        {
          validators: usernameFormatValidator,
          asyncValidators: [
            this.availabilityValidator(
              (value) => this.auth.checkUsername(value),
              this.usernameAvailability,
            ),
          ],
        },
      ],
      email: [
        '',
        {
          validators: [Validators.required, Validators.email, Validators.maxLength(255)],
          asyncValidators: [
            this.availabilityValidator(
              (value) => this.auth.checkEmail(value.toLowerCase()),
              this.emailAvailability,
            ),
          ],
        },
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      timezone: [DEFAULT_TIMEZONE],
    },
    { validators: passwordsMatch },
  );

  protected submit(): void {
    if (this.submitting()) return;
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, email, password, confirmPassword, timezone } = this.form.getRawValue();
    this.submitting.set(true);

    this.auth
      .signup({
        username: username.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        timezone: timezone || DEFAULT_TIMEZONE,
      })
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.registered.set(true),
        error: (error: unknown) => this.handleSubmitError(error),
      });
  }

  /** Message for the first error on a field, or null while it should stay quiet. */
  protected fieldError(name: FieldName): string | null {
    const control = this.form.controls[name];
    const errors = control.errors ?? {};

    // Availability results come from the live check, so show them as soon as the user types.
    if (errors['taken']) {
      return name === 'email' ? 'Email already registered.' : 'Username already taken.';
    }
    if (errors['server']) return errors['server'];

    if (!control.touched) return null;

    if (errors['required']) return REQUIRED_MESSAGES[name];
    if (errors['maxlength']) {
      return `Must be ${errors['maxlength'].requiredLength} characters or fewer.`;
    }
    if (errors['minlength']) return 'Password must be at least 8 characters.';
    if (errors['pattern']) {
      return 'Username format is invalid. Use letters, numbers, periods, hyphens or underscores.';
    }
    if (errors['email']) return 'Enter a valid email address.';
    if (name === 'confirmPassword' && this.form.hasError('passwordMismatch')) {
      return 'Passwords do not match.';
    }
    return null;
  }

  private availabilityValidator(
    check: (value: string) => Observable<AvailabilityResponse>,
    state: WritableSignal<Availability>,
  ): AsyncValidatorFn {
    // Angular re-runs async validators on every change and cancels the previous run,
    // so waiting on a timer first gives one request per settled input.
    return (control) => {
      const value = String(control.value ?? '').trim();
      if (!value) {
        state.set('idle');
        return of(null);
      }

      state.set('checking');
      return timer(AVAILABILITY_DEBOUNCE_MS).pipe(
        switchMap(() => check(value)),
        map(({ available }) => {
          state.set(available ? 'available' : 'taken');
          return available ? null : { taken: true };
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 400) {
            state.set('invalid');
            return of({ server: apiErrorMessage(error) ?? 'This value is not valid.' });
          }
          // Network or server failure: don't block the user. Signup still enforces uniqueness.
          state.set('unknown');
          return of(null);
        }),
      );
    };
  }

  private handleSubmitError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const field = /email/i.test(apiErrorMessage(error) ?? '') ? 'email' : 'username';
      const control = this.form.controls[field];
      control.setErrors({ taken: true });
      control.markAsTouched();
      (field === 'email' ? this.emailAvailability : this.usernameAvailability).set('taken');
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 400) {
      const body = error.error as ApiErrorBody | null;
      for (const { field, message } of body?.details ?? []) {
        const control = this.form.get(field);
        control?.setErrors({ server: message });
        control?.markAsTouched();
      }
      this.formError.set(body?.error ?? 'Some details are invalid. Check the form and try again.');
      return;
    }

    this.formError.set('Something went wrong on our side. Please try again in a moment.');
  }
}

const REQUIRED_MESSAGES: Record<FieldName, string> = {
  username: 'Username is required.',
  email: 'Email is required.',
  password: 'Password is required.',
  confirmPassword: 'Confirm your password.',
};
