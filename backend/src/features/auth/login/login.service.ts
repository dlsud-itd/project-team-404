import { AuthUnauthorizedError } from '../shared/errors/auth.error';
import { SupabaseAuthRequestError } from '../shared/errors/auth.error';
import type { UserRecord } from '../shared/models/user.model';
import { toPublicUser, toUser } from '../shared/models/user.model';
import { InvalidCredentialsError } from './errors/invalid-credentials.error';
import type { LoginInput } from './validators/login.validator';

export type LoginDependencies = {
  findUserByIdentifier(identifier: string): Promise<UserRecord | null>;
  verifyCredentials(email: string, password: string): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
  issueSession(userId: string): Promise<string>;
  getInboxProjectId(userId: string): Promise<number | null>;
};

export class LoginService {
  constructor(private readonly dependencies: LoginDependencies) {}

  async login(input: LoginInput) {
    const user = await this.dependencies.findUserByIdentifier(input.identifier);
    const mapped = user && toUser(user);
    if (!user || user.deletedAt || !mapped) {
      throw new InvalidCredentialsError();
    }
    try {
      await this.dependencies.verifyCredentials(mapped.email, input.password);
    } catch (error) {
      if (
        error instanceof SupabaseAuthRequestError &&
        (error.status === 400 || error.status === 401 || error.status === 422)
      ) {
        throw new InvalidCredentialsError();
      }
      throw error;
    }
    const inboxProjectId = await this.dependencies.getInboxProjectId(user.id);
    if (inboxProjectId === null) {
      throw new AuthUnauthorizedError('Account is unavailable');
    }
    await this.dependencies.updateLastLogin(user.id);
    const token = await this.dependencies.issueSession(user.id);
    return { token, user: toPublicUser(mapped, inboxProjectId) };
  }
}
