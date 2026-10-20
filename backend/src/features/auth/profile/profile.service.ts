import { AuthConflictError } from '../shared/errors/auth.error';
import type { Profile, ProfileUpdateInput } from './types/profile.types';

export type ProfileDependencies = {
  findProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, update: ProfileUpdate): Promise<Profile>;
};

type ProfileUpdate = {
  username?: string;
  timezone?: string;
};

export class ProfileService {
  constructor(private readonly dependencies: ProfileDependencies) {}

  async getProfile(userId: string): Promise<Profile> {
    const profile = await this.dependencies.findProfile(userId);
    if (!profile) {
      throw new AuthConflictError('Profile not found');
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    input: ProfileUpdateInput
  ): Promise<Profile> {
    const update: ProfileUpdate = {};

    if (input.username !== undefined) {
      update.username = input.username.trim();
    }
    if (input.timezone !== undefined) {
      update.timezone = input.timezone;
    }

    try {
      return await this.dependencies.updateProfile(userId, update);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new AuthConflictError('Username is already in use');
      }
      throw error;
    }
  }
}
