import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { SessionService } from '../session/session.service';
import {
  type ResetTokenStatus,
  readTokenStatus,
  tokenStatusMessage,
} from './token-status-message.util';

type ResetStatus = 'checking' | 'ready' | ResetTokenStatus;

export const RESET_SUCCESS_REDIRECT = '/login?reset=success';

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
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly token: string | null;

  protected readonly status = signal<ResetStatus>('checking');
  protected readonly tokenProblem = computed(() => {
    const status = this.status();
    return status === 'checking' || status === 'ready' ? null : tokenStatusMessage(status);
  });
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
    this.token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.status.set('missing');
      return;
    }

    // Keep the token out of the address bar and browser history.
    void this.router.navigate([], {
      queryParams: { token: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.auth
      .validateResetToken(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ valid }) => this.status.set(valid ? 'ready' : 'invalid'),
        error: (error: unknown) => this.status.set(readTokenStatus(error)),
      });
  }

  protected submit(): void {
    const token = this.token;
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
        next: () => {
          // The backend revokes every session on reset, so sign out here too.
          this.session.clear();
          void this.router.navigateByUrl(RESET_SUCCESS_REDIRECT);
        },
        error: (error: unknown) => {
          // A 400 here means the token stopped working; the backend gives no reason.
          if (error instanceof HttpErrorResponse && error.status === 400) {
            this.status.set('expired');
            return;
          }
          this.error.set('We could not update your password. Please try again.');
        },
      });
  }
}
