import { AuthUnauthorizedError } from '../shared/errors/auth.error';
import type { UserRecord } from '../shared/models/user.model';
import { isSessionUsable } from './models/session.model';
import { generateToken } from './utils/generate-token.util';
import { hashToken } from './utils/hash-token.util';

export type SessionDependencies = {
  createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<{
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  } | null>;
  revokeSession(tokenHash: string): Promise<void>;
  findUserById(userId: string): Promise<UserRecord | null>;
  findMeWithInbox(userId: string): Promise<{
    id: string;
    username: string;
    email: string;
    timezone: string;
    inboxProjectId: number;
  } | null>;
};

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export class SessionService {
  constructor(
    private readonly dependencies: SessionDependencies,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async issue(userId: string): Promise<string> {
    const token = generateToken();
    await this.dependencies.createSession({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(this.now().getTime() + SESSION_LIFETIME_MS),
    });
    return token;
  }

  async verify(token: string): Promise<{ userId: string; expiresAt: Date }> {
    const session = await this.dependencies.findSessionByTokenHash(hashToken(token));
    if (!isSessionUsable(session, this.now())) {
      throw new AuthUnauthorizedError('Token invalid or expired');
    }
    const user = await this.dependencies.findUserById(session.userId);
    if (!user || user.deletedAt) {
      throw new AuthUnauthorizedError('Token invalid or expired');
    }
    return { userId: session.userId, expiresAt: session.expiresAt };
  }

  async expire(token: string): Promise<void> {
    await this.revoke(token);
  }

  async revoke(token: string): Promise<void> {
    const session = await this.dependencies.findSessionByTokenHash(hashToken(token));
    if (!isSessionUsable(session, this.now())) {
      throw new AuthUnauthorizedError('Unauthorized');
    }
    await this.dependencies.revokeSession(hashToken(token));
  }

  async getMe(userId: string) {
    const user = await this.dependencies.findMeWithInbox(userId);
    if (!user) {
      throw new AuthUnauthorizedError('Token invalid or expired');
    }
    return user;
  }
}
