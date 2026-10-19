import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';

type ResetStatus = 'checking' | 'ready' | 'invalid' | 'complete';

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmation')?.value;
  return confirmation && password !== confirmation ? { mismatch: true } : null;
};

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: '../forgot-password/recovery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly token = signal<string | null>(null);

  protected readonly status = signal<ResetStatus>('checking');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    const url = new URL(window.location.href);
    const resetToken = url.searchParams.get('token');
    if (!resetToken) {
      this.status.set('invalid');
      return;
    }

    this.token.set(resetToken);
    url.searchParams.delete('token');
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    this.auth
      .validateResetToken(resetToken)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ valid }) => this.status.set(valid ? 'ready' : 'invalid'),
        error: () => this.status.set('invalid'),
      });
  }

  protected submit(): void {
    const token = this.token();
    if (!token || this.status() !== 'ready' || this.submitting()) return;
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.auth
      .resetPassword(token, this.form.controls.password.value)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.status.set('complete'),
        error: (error: unknown) => {
          this.error.set(
            error instanceof HttpErrorResponse && error.status === 400
              ? 'This reset link is invalid or has expired. Request a new one.'
              : 'We could not update your password. Please try again.',
          );
        },
      });
  }
}
