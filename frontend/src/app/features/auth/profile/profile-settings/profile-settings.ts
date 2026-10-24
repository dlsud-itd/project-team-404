import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  USERNAME_MAX_LENGTH,
  usernameFormatValidator,
} from '../../../../shared/validators/username-format.validator';
import { listTimezones } from '../../register/register';
import { ChangePasswordForm } from '../change-password/change-password-form';
import { SessionService } from '../../session/session.service';
import { mapProfileError } from '../mappers/profile-error.mapper';
import { ProfileService } from '../services/profile.service';
import type { Profile, ProfileField, UpdateProfileRequest } from '../types/profile.types';
import { diffProfile } from '../utils/diff-profile.util';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-profile-settings',
  imports: [ReactiveFormsModule, RouterLink, ChangePasswordForm],
  templateUrl: './profile-settings.html',
  styleUrl: './profile-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSettings {
  private readonly profiles = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly session = inject(SessionService);

  protected readonly usernameMax = USERNAME_MAX_LENGTH;

  /** The profile as last saved. */
  protected readonly profile = signal<Profile | null>(null);
  protected readonly loadState = signal<LoadState>('loading');
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);
  protected readonly serverErrors = signal<Partial<Record<ProfileField, string>>>({});

  /** Every IANA zone, plus the saved one if this browser doesn't list it. */
  protected readonly timezones = computed(() => {
    const zones = listTimezones();
    const current = this.profile()?.timezone;
    return current && !zones.includes(current) ? [current, ...zones] : zones;
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', usernameFormatValidator],
    timezone: [''],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadState.set('loading');
    this.profiles
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.showSaved(profile);
          this.loadState.set('ready');
        },
        error: () => this.loadState.set('error'),
      });
  }

  /** Save stays off until a field actually changed and the form is valid. */
  protected canSave(): boolean {
    return !this.submitting() && this.form.valid && Object.keys(this.changes()).length > 0;
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
    const changes = this.changes();
    if (Object.keys(changes).length === 0) return;

    this.submitting.set(true);
    this.profiles
      .update(changes)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.showSaved(profile);
          this.saved.set('Profile updated.');
        },
        error: (error: unknown) => {
          const { message, field } = mapProfileError(error);
          if (field) this.serverErrors.set({ [field]: message });
          else this.formError.set(message);
        },
      });
  }

  protected clearServerError(field: ProfileField): void {
    if (this.serverErrors()[field]) {
      this.serverErrors.update((errors) => ({ ...errors, [field]: undefined }));
    }
  }

  /** Message for a field, or null. Format errors show while typing; required only after leaving. */
  protected fieldError(field: ProfileField): string | null {
    const server = this.serverErrors()[field];
    if (server) return server;

    const control = this.form.controls[field];
    const errors = control.errors;
    if (!errors || !(control.touched || control.dirty)) return null;

    if (errors['required']) return control.touched ? 'Username is required.' : null;
    if (errors['maxlength']) return `Use ${USERNAME_MAX_LENGTH} characters or fewer.`;
    if (errors['pattern']) {
      return 'Username format is invalid. Use letters, numbers, periods, hyphens or underscores.';
    }
    return null;
  }

  private changes(): UpdateProfileRequest {
    const profile = this.profile();
    return profile ? diffProfile(profile, this.form.getRawValue()) : {};
  }

  private showSaved(profile: Profile): void {
    this.profile.set(profile);
    this.form.reset({ username: profile.username, timezone: profile.timezone ?? '' });
  }
}
