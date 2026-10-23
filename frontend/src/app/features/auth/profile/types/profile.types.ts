/** The profile returned by GET and PATCH /api/auth/profile. */
export interface Profile {
  id: string;
  username: string;
  timezone: string | null;
}

/** Body of PATCH /api/auth/profile: only the fields that changed. */
export type UpdateProfileRequest = Partial<{ username: string; timezone: string }>;

export type ProfileField = 'username' | 'timezone';

/** The form's current values, before trimming. */
export interface ProfileFormValues {
  username: string;
  timezone: string;
}

/** Body of POST /api/auth/profile/password. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type PasswordField = keyof ChangePasswordRequest;

/** A failed password change, turned into something the form can show. */
export interface PasswordError {
  message: string;
  /** The form field the server rejected, when known. */
  field?: PasswordField;
}

/** A failed profile request, turned into something the page can show. */
export interface ProfileError {
  message: string;
  /** The form field the server rejected, when known. */
  field?: ProfileField;
}
