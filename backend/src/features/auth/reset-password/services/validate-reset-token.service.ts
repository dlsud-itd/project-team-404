import { hashToken } from '../../session/utils/hash-token.util';
import { ResetTokenError } from '../errors/reset-token.error';

export type ResetTokenDependencies = {
  findResetTokenByHash(tokenHash: string): Promise<{
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null>;
};

export class ValidateResetTokenService {
  constructor(
    private readonly dependencies: ResetTokenDependencies,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async validate(token: string) {
    const record = await this.dependencies.findResetTokenByHash(hashToken(token));
    if (!record) {
      throw new ResetTokenError('invalid');
    }
    if (record.usedAt) {
      throw new ResetTokenError('used');
    }
    if (record.expiresAt.getTime() <= this.now().getTime()) {
      throw new ResetTokenError('expired');
    }
    return record;
  }
}
