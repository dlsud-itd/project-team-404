import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { mapLoginError } from './mappers/login-error.mapper';
import { POST_LOGIN_REDIRECT } from '../session/auth.guards';
import { SessionService } from '../session/session.service';

export { POST_LOGIN_REDIRECT };

type FieldName = 'identifier' | 'password';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  /** Set when the reset-password page sends the user here after a successful reset. */
  protected readonly passwordReset =
    inject(ActivatedRoute).snapshot.queryParamMap.get('reset') === 'success';

  protected readonly form = inject(FormBuilder).nonNullable.group({
    identifier: ['', [Validators.required, Validators.maxLength(255)]],
    password: ['', Validators.required],
    remember: [false],
  });

  protected submit(): void {
    if (this.submitting()) return;
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { identifier, password, remember } = this.form.getRawValue();
    this.submitting.set(true);

    this.session
      .login({ identifier: identifier.trim(), password }, remember)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl(POST_LOGIN_REDIRECT),
        error: (error: unknown) => {
          const { message, clearPassword } = mapLoginError(error);
          this.formError.set(message);
          if (clearPassword) this.form.controls.password.reset();
        },
      });
  }

  /** Message for a field's error, or null until the user has left the field. */
  protected fieldError(name: FieldName): string | null {
    const control = this.form.controls[name];
    if (!control.touched || !control.errors) return null;

    if (control.errors['required']) {
      return name === 'identifier' ? 'Email or username is required.' : 'Password is required.';
    }
    if (control.errors['maxlength']) return 'Must be 255 characters or fewer.';
    return null;
  }
}
