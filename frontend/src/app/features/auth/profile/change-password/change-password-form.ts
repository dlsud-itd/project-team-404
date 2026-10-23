import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { mapChangePasswordError } from '../mappers/change-password-error.mapper';
import { SessionService } from '../../session/session.service';
import { ProfileService } from '../services/profile.service';
import type { PasswordField } from '../types/profile.types';

export const PASSWORD_MIN_LENGTH = 8;

/** Group rules the server also enforces: confirm must match, and the new password must differ. */
const passwordRules: ValidatorFn = (group) => {
  const { currentPassword, newPassword, confirmPassword } = group.value as Record<
    PasswordField,
    string
  >;
  const errors: Record<string, true> = {};
  if (confirmPassword && newPassword !== confirmPassword) errors['passwordMismatch'] = true;
  if (newPassword && newPassword === currentPassword) errors['sameAsCurrent'] = true;
  return Object.keys(errors).length ? errors : null;
};

@Component({
  selector: 'app-change-password-form',
  imports: [ReactiveFormsModule],
  templateUrl: './change-password-form.html',
  styleUrl: './change-password-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordForm {
  private readonly profiles = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly session = inject(SessionService);

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly visible = signal<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);
  protected readonly serverErrors = signal<Partial<Record<PasswordField, string>>>({});

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordRules },
  );

  protected toggle(field: PasswordField): void {
    this.visible.update((v) => ({ ...v, [field]: !v[field] }));
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.formError.set(null);
    this.saved.set(null);
    this.serverErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.profiles
      .changePassword(this.form.getRawValue())
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          // Clear the passwords so they don't linger on screen or in memory.
          this.form.reset();
          this.visible.set({ currentPassword: false, newPassword: false, confirmPassword: false });
          this.saved.set("Password changed. You've been signed out on other devices.");
        },
        error: (error: unknown) => {
          const { message, field } = mapChangePasswordError(error);
          if (field) this.serverErrors.set({ [field]: message });
          else this.formError.set(message);
        },
      });
  }

  protected clearServerError(field: PasswordField): void {
    if (this.serverErrors()[field]) {
      this.serverErrors.update((errors) => ({ ...errors, [field]: undefined }));
    }
  }

  /** Message for a field, or null. Required shows after leaving; the rest while typing. */
  protected fieldError(field: PasswordField): string | null {
    const server = this.serverErrors()[field];
    if (server) return server;

    const control = this.form.controls[field];
    if (!(control.touched || control.dirty)) return null;
    const errors = control.errors ?? {};

    if (errors['required']) return control.touched ? REQUIRED_MESSAGES[field] : null;
    if (errors['minlength']) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    if (field === 'newPassword' && this.form.hasError('sameAsCurrent')) {
      return 'New password must be different from the current password.';
    }
    if (field === 'confirmPassword' && this.form.hasError('passwordMismatch')) {
      return 'Passwords do not match.';
    }
    return null;
  }
}

const REQUIRED_MESSAGES: Record<PasswordField, string> = {
  currentPassword: 'Enter your current password.',
  newPassword: 'Enter a new password.',
  confirmPassword: 'Confirm your new password.',
};
