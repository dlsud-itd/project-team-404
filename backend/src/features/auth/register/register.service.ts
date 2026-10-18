import { AuthConflictError } from './errors/register.errors';
import type { SignupInput, SignupResult } from './types/register.types';
import { normalizeEmail } from './utils/normalize-email.util';
import { SupabaseAuthRequestError } from '../shared/errors/auth.error';

export type RegisterDependencies = {
  isUsernameAvailable(username: string): Promise<boolean>;
  isEmailAvailable(email: string): Promise<boolean>;
  createAuthUser(input: {
    email: string;
    password: string;
    username: string;
  }): Promise<{ id: string }>;
  deleteAuthUser(userId: string): Promise<void>;
  createUserProfile(input: {
    userId: string;
    username: string;
    email: string;
    timezone: string;
  }): Promise<void>;
  createInboxProject(userId: string): Promise<number>;
};

export class RegisterService {
  constructor(private readonly dependencies: RegisterDependencies) {}

  async checkUsername(username: string): Promise<boolean> {
    return this.dependencies.isUsernameAvailable(username);
  }

  async checkEmail(email: string): Promise<boolean> {
    return this.dependencies.isEmailAvailable(normalizeEmail(email));
  }

  async register(input: SignupInput): Promise<SignupResult> {
    const email = normalizeEmail(input.email);
    if (!(await this.dependencies.isUsernameAvailable(input.username))) {
      throw new AuthConflictError('Username is already in use');
    }
    if (!(await this.dependencies.isEmailAvailable(email))) {
      throw new AuthConflictError('Email is already in use');
    }

    let user: { id: string };
    try {
      user = await this.dependencies.createAuthUser({
        email,
        password: input.password,
        username: input.username,
      });
    } catch (error) {
      if (isEmailConflict(error)) {
        throw new AuthConflictError('Email is already in use');
      }
      throw error;
    }
    try {
      await this.dependencies.createUserProfile({
        userId: user.id,
        username: input.username,
        email,
        timezone: input.timezone,
      });
      const inboxProjectId = await this.dependencies.createInboxProject(user.id);
      return { userId: user.id, inboxProjectId };
    } catch (error) {
      try {
        await this.dependencies.deleteAuthUser(user.id);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Registration failed and the created Auth user could not be removed',
        );
      }
      if (isUniqueConflict(error)) {
        throw new AuthConflictError('Username or email is already in use');
      }
      throw error;
    }
  }
}

export function createRegisterService(
  dependencies: RegisterDependencies,
): RegisterService {
  return new RegisterService(dependencies);
}

function isEmailConflict(error: unknown): boolean {
  if (!(error instanceof SupabaseAuthRequestError)) {
    return false;
  }
  const details = error.details;
  return (
    error.status === 409 ||
    ((error.status === 400 || error.status === 422) &&
      typeof details === 'object' &&
      details !== null &&
      'code' in details &&
      (details.code === 'email_exists' ||
        details.code === 'user_already_exists'))
  );
}

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
