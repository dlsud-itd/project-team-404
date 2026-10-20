import { describe, expect, it, vi } from 'vitest';
import { AuthConflictError } from '../shared/errors/auth.error';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  it('returns the current user profile', async () => {
    const dependencies = {
      findProfile: vi.fn().mockResolvedValue({
        id: 'user-123',
        username: 'harvey',
        timezone: 'Asia/Manila',
      }),
      updateProfile: vi.fn(),
    };

    const service = new ProfileService(dependencies);

    await expect(service.getProfile('user-123')).resolves.toEqual({
      id: 'user-123',
      username: 'harvey',
      timezone: 'Asia/Manila',
    });
  });

  it('throws when the profile is missing', async () => {
    const service = new ProfileService({
      findProfile: vi.fn().mockResolvedValue(null),
      updateProfile: vi.fn(),
    });

    await expect(service.getProfile('user-123')).rejects.toThrow(
      new AuthConflictError('Profile not found')
    );
  });

  it('normalizes and updates profile fields', async () => {
    const dependencies = {
      findProfile: vi.fn(),
      updateProfile: vi.fn().mockResolvedValue({
        id: 'user-123',
        username: 'harvey',
        timezone: 'Europe/London',
      }),
    };

    const service = new ProfileService(dependencies);

    await expect(
      service.updateProfile('user-123', {
        username: '  harvey  ',
        timezone: 'Europe/London',
      })
    ).resolves.toEqual({
      id: 'user-123',
      username: 'harvey',
      timezone: 'Europe/London',
    });

    expect(dependencies.updateProfile).toHaveBeenCalledWith('user-123', {
      username: 'harvey',
      timezone: 'Europe/London',
    });
  });

  it('throws a conflict error when the username already exists', async () => {
    const service = new ProfileService({
      findProfile: vi.fn(),
      updateProfile: vi.fn().mockRejectedValue({ code: 'P2002' }),
    });

    await expect(
      service.updateProfile('user-123', { username: 'taken-name' })
    ).rejects.toThrow(new AuthConflictError('Username is already in use'));
  });
});
