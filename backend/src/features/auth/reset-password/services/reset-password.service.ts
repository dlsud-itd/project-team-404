import { hashToken } from '../../session/utils/hash-token.util';
import type { ValidateResetTokenService } from './validate-reset-token.service';
import { ResetTokenError } from '../errors/reset-token.error';

export type ResetPasswordDependencies = {
  updatePassword(userId: string, password: string): Promise<void>;
  markResetTokenUsed(tokenHash: string, now: Date): Promise<boolean>;
  revokeUserSessions(userId: string): Promise<void>;
};

export class ResetPasswordService {
  constructor(
    private readonly tokens: ValidateResetTokenService,
    private readonly dependencies: ResetPasswordDependencies,
    private readonly now: () => Date = () => new Date()
  ) {}

  async reset(token: string, password: string): Promise<void> {
    const record = await this.tokens.validate(token);
    const marked = await this.dependencies.markResetTokenUsed(
      hashToken(token),
      this.now()
    );
    if (!marked) {
      throw new ResetTokenError('used');
    }
    await this.dependencies.updatePassword(record.userId, password);
    await this.dependencies.revokeUserSessions(record.userId);
  }
}
