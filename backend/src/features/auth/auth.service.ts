import type { AuthRepository, PasswordResetInput } from './auth.repository';

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async requestPasswordReset(email: string): Promise<void> {
    if (typeof this.repository.requestPasswordReset === 'function') {
      await this.repository.requestPasswordReset(email);
      return;
    }
  }

  async validateResetToken(token: string): Promise<boolean> {
    if (typeof this.repository.validateResetToken === 'function') {
      return this.repository.validateResetToken(token);
    }

    return token.trim().length > 0;
  }

  async resetPassword(token: string, password: string): Promise<void> {
    if (typeof this.repository.resetPassword === 'function') {
      await this.repository.resetPassword({ token, password } satisfies PasswordResetInput);
      return;
    }

    if (!token.trim()) {
      throw new Error('This reset link is invalid or has expired.');
    }
  }
}
