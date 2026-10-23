import { describe, expect, it, vi } from 'vitest';
import {
  AuthUnauthorizedError,
  InvalidCurrentPasswordError,
  SupabaseAuthRequestError,
} from '../shared/errors/auth.error';
import { ChangePasswordService } from './change-password.service';

const user = {
  id: 'user-123',
  username: 'harvey',
  email: 'Harvey@Example.com',
  timezone: 'Asia/Manila',
  deletedAt: null,
};

function setup(
  overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}
) {
  const dependencies = {
    findUserById: vi.fn().mockResolvedValue(user),
    verifyCredentials: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    revokeOtherSessions: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { dependencies, service: new ChangePasswordService(dependencies) };
}

describe('ChangePasswordService', () => {
  it('verifies the current password, updates it and revokes other sessions', async () => {
    const { dependencies, service } = setup();

    await service.change(
      'user-123',
      'current-hash',
      'old-password',
      'new-password'
    );

    expect(dependencies.verifyCredentials).toHaveBeenCalledWith(
      'harvey@example.com',
      'old-password'
    );
    expect(dependencies.updatePassword).toHaveBeenCalledWith(
      'user-123',
      'new-password'
    );
    expect(dependencies.revokeOtherSessions).toHaveBeenCalledWith(
      'user-123',
      'current-hash'
    );
  });

  it.each([400, 401, 422])(
    'reports a wrong current password when Supabase answers %s',
    async (status) => {
      const { dependencies, service } = setup({
        verifyCredentials: vi
          .fn()
          .mockRejectedValue(
            new SupabaseAuthRequestError('Invalid login', status, null)
          ),
      });

      await expect(
        service.change('user-123', 'current-hash', 'wrong', 'new-password')
      ).rejects.toBeInstanceOf(InvalidCurrentPasswordError);
      expect(dependencies.updatePassword).not.toHaveBeenCalled();
      expect(dependencies.revokeOtherSessions).not.toHaveBeenCalled();
    }
  );

  it('re-throws other Supabase failures', async () => {
    const failure = new SupabaseAuthRequestError('Unavailable', 503, null);
    const { dependencies, service } = setup({
      verifyCredentials: vi.fn().mockRejectedValue(failure),
    });

    await expect(
      service.change('user-123', 'current-hash', 'old-password', 'new-password')
    ).rejects.toBe(failure);
    expect(dependencies.updatePassword).not.toHaveBeenCalled();
  });

  it.each([null, { ...user, deletedAt: new Date() }, { ...user, email: null }])(
    'rejects a missing or unusable account',
    async (record) => {
      const { dependencies, service } = setup({
        findUserById: vi.fn().mockResolvedValue(record),
      });

      await expect(
        service.change(
          'user-123',
          'current-hash',
          'old-password',
          'new-password'
        )
      ).rejects.toBeInstanceOf(AuthUnauthorizedError);
      expect(dependencies.verifyCredentials).not.toHaveBeenCalled();
    }
  );
});
