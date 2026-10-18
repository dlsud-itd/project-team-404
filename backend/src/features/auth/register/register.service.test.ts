import { describe, expect, it, vi } from 'vitest';
import { AuthConflictError } from './errors/register.errors';
import { RegisterService, type RegisterDependencies } from './register.service';
import type { SignupInput } from './types/register.types';

const input: SignupInput = {
  username: 'harvey',
  email: 'Harvey@example.com',
  password: 'secure-password',
  confirmPassword: 'secure-password',
  timezone: 'Asia/Manila',
};

function dependencies(): RegisterDependencies {
  return {
    isUsernameAvailable: vi.fn().mockResolvedValue(true),
    isEmailAvailable: vi.fn().mockResolvedValue(true),
    createAuthUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
    deleteAuthUser: vi.fn().mockResolvedValue(undefined),
    createUserProfile: vi.fn().mockResolvedValue(undefined),
    createInboxProject: vi.fn().mockResolvedValue(42),
  };
}

describe('RegisterService', () => {
  it('creates the Auth user, profile, and default Inbox in order', async () => {
    const deps = dependencies();
    const service = new RegisterService(deps);

    await expect(service.register(input)).resolves.toEqual({
      userId: 'user-123',
      inboxProjectId: 42,
    });
    expect(deps.createAuthUser).toHaveBeenCalledWith({
      email: 'harvey@example.com',
      password: input.password,
      username: input.username,
    });
    expect(deps.createUserProfile).toHaveBeenCalledWith({
      userId: 'user-123',
      username: input.username,
      email: 'harvey@example.com',
      timezone: input.timezone,
    });
  });

  it.each([
    ['username', 'Username is already in use'],
    ['email', 'Email is already in use'],
  ])('rejects an unavailable %s', async (kind, message) => {
    const deps = dependencies();
    if (kind === 'username') {
      vi.mocked(deps.isUsernameAvailable).mockResolvedValue(false);
    } else {
      vi.mocked(deps.isEmailAvailable).mockResolvedValue(false);
    }
    const service = new RegisterService(deps);

    await expect(service.register(input)).rejects.toThrow(
      new AuthConflictError(message),
    );
    expect(deps.createAuthUser).not.toHaveBeenCalled();
  });

  it('deletes the Auth user when profile or Inbox creation fails', async () => {
    const deps = dependencies();
    vi.mocked(deps.createInboxProject).mockRejectedValue(
      new Error('project insert failed'),
    );
    const service = new RegisterService(deps);

    await expect(service.register(input)).rejects.toThrow('project insert failed');
    expect(deps.deleteAuthUser).toHaveBeenCalledWith('user-123');
  });

  it('surfaces both the create and cleanup failures', async () => {
    const deps = dependencies();
    const createError = new Error('profile insert failed');
    vi.mocked(deps.createUserProfile).mockRejectedValue(createError);
    vi.mocked(deps.deleteAuthUser).mockRejectedValue(
      new Error('Auth cleanup failed'),
    );
    const service = new RegisterService(deps);

    await expect(service.register(input)).rejects.toBeInstanceOf(AggregateError);
  });
});
