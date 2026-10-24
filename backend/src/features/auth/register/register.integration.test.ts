import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import { request } from '../../../testing/helpers/request';
import { RegisterService } from './register.service';
import { createRegisterRouter } from './register.routes';

describe('registration integration', () => {
  it('validates, registers, and returns the account and Inbox identifiers', async () => {
    const calls: string[] = [];
    const service = new RegisterService({
      isUsernameAvailable: vi.fn().mockResolvedValue(true),
      isEmailAvailable: vi.fn().mockResolvedValue(true),
      createAuthUser: vi.fn().mockImplementation(async () => {
        calls.push('auth');
        return { id: 'user-123' };
      }),
      deleteAuthUser: vi.fn(),
      createUserProfile: vi.fn().mockImplementation(async () => {
        calls.push('profile');
      }),
      createInboxProject: vi.fn().mockImplementation(async () => {
        calls.push('inbox');
        return 42;
      }),
    });
    const app = express();
    app.use(express.json());
    app.use('/api/auth', createRegisterRouter(service));

    const response = await request(app, '/api/auth/signup', {
      method: 'POST',
      body: {
        username: 'harvey',
        email: 'Harvey@example.com',
        password: 'secure-password',
        confirmPassword: 'secure-password',
        timezone: 'Asia/Manila',
      },
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      userId: 'user-123',
      inboxProjectId: 42,
    });
    expect(calls).toEqual(['auth', 'profile', 'inbox']);
  });

  it('rejects invalid signup before invoking registration dependencies', async () => {
    const createAuthUser = vi.fn();
    const service = new RegisterService({
      isUsernameAvailable: vi.fn(),
      isEmailAvailable: vi.fn(),
      createAuthUser,
      deleteAuthUser: vi.fn(),
      createUserProfile: vi.fn(),
      createInboxProject: vi.fn(),
    });
    const app = express();
    app.use(express.json());
    app.use('/api/auth', createRegisterRouter(service));

    const response = await request(app, '/api/auth/signup', {
      method: 'POST',
      body: { username: 'x' },
    });

    expect(response.status).toBe(400);
    expect(createAuthUser).not.toHaveBeenCalled();
  });
});
