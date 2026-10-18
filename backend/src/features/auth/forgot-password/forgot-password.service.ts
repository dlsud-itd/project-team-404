import type { Mailer } from './mailer/mailer';
import { buildResetLink } from './utils/build-reset-link.util';
import { resetLinkEmail } from './templates/reset-link.email';
import { generateToken } from '../session/utils/generate-token.util';
import { hashToken } from '../session/utils/hash-token.util';

export type ForgotPasswordDependencies = {
  findUserByEmail(email: string): Promise<{ id: string; email: string | null } | null>;
  invalidateResetTokens(userId: string): Promise<void>;
  createResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  mailer: Mailer;
  webBaseUrl: string;
};

export class ForgotPasswordService {
  constructor(
    private readonly dependencies: ForgotPasswordDependencies,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async request(email: string): Promise<void> {
    const user = await this.dependencies.findUserByEmail(email.toLowerCase());
    if (!user?.email) {
      return;
    }
    await this.dependencies.invalidateResetTokens(user.id);
    const token = generateToken();
    await this.dependencies.createResetToken({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(this.now().getTime() + 60 * 60 * 1000),
    });
    const emailContent = resetLinkEmail(
      buildResetLink(this.dependencies.webBaseUrl, token),
    );
    await this.dependencies.mailer.send({
      to: user.email,
      ...emailContent,
    });
  }
}
