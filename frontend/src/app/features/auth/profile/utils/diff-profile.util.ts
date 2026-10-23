import type { Profile, ProfileFormValues, UpdateProfileRequest } from '../types/profile.types';

/** The fields that differ from the saved profile, so a save sends only what changed. */
export function diffProfile(saved: Profile, values: ProfileFormValues): UpdateProfileRequest {
  const changes: UpdateProfileRequest = {};
  const username = values.username.trim();
  if (username !== saved.username) changes.username = username;
  if (values.timezone && values.timezone !== saved.timezone) changes.timezone = values.timezone;
  return changes;
}
