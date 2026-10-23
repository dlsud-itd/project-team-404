import {
  AuthUnauthorizedError,
  InvalidCurrentPasswordError,
  SupabaseAuthRequestError,
} from '../shared/errors/auth.error';
import type { UserRecord } from '../shared/models/user.model';

export type ChangePasswordDependencies = {
  findUserById(userId: string): Promise<UserRecord | null>;
  verifyCredentials(email: string, password: string): Promise<void>;
  updatePassword(userId: string, password: string): Promise<void>;
  revokeOtherSessions(userId: string, keepTokenHash: string): Promise<void>;
};

export class ChangePasswordService {
  constructor(private readonly dependencies: ChangePasswordDependencies) {}

  /**
   * Checks the current password, sets the new one, then signs out every other device.
   * The session making the request (`currentTokenHash`) stays signed in.
   */
  async change(
    userId: string,
    currentTokenHash: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.dependencies.findUserById(userId);
    if (!user || user.deletedAt || !user.email) {
      throw new AuthUnauthorizedError('Account is unavailable');
    }

    try {
      await this.dependencies.verifyCredentials(
        user.email.toLowerCase(),
        currentPassword
      );
    } catch (error) {
      if (
        error instanceof SupabaseAuthRequestError &&
        (error.status === 400 || error.status === 401 || error.status === 422)
      ) {
        throw new InvalidCurrentPasswordError();
      }
      throw error;
    }

    await this.dependencies.updatePassword(userId, newPassword);
    await this.dependencies.revokeOtherSessions(userId, currentTokenHash);
  }
}
