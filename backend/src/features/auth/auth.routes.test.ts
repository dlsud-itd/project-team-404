import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import { request } from '../../testing/helpers/request';
import { createAuthRouter } from './auth.routes';
import { type AuthRepository } from './auth.repository';

const createTestApp = (repository: AuthRepository) => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(repository));
  return app;
};

const validSignup = {
  username: 'harvey',
  email: 'Harvey@example.com',
  password: 'secure-password',
  confirmPassword: 'secure-password',
  timezone: 'Asia/Manila',
};

describe('auth routes', () => {
  it('creates a new account and returns the user and Inbox ids', async () => {
    const repository: AuthRepository = {
      isUsernameAvailable: vi.fn().mockResolvedValue(true),
      isEmailAvailable: vi.fn().mockResolvedValue(true),
      createUser: vi
        .fn()
        .mockResolvedValue({ userId: 'user-123', inboxProjectId: 42 }),
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
    };

    const response = await request(
      createTestApp(repository),
      '/api/auth/signup',
      {
        method: 'POST',
        body: validSignup,
      }
    );

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ userId: 'user-123', inboxProjectId: 42 });
    expect(repository.createUser).toHaveBeenCalledWith({
      ...validSignup,
      email: 'harvey@example.com',
    });
  });

  it('logs in with an email or username and returns a session token', async () => {
    const repository: AuthRepository = {
      isUsernameAvailable: vi.fn(),
      isEmailAvailable: vi.fn(),
      createUser: vi.fn(),
      login: vi.fn().mockResolvedValue({
        token: 'jwt-token',
        user: {
          id: 'user-123',
          username: 'harvey',
          email: 'harvey@example.com',
          timezone: 'Asia/Manila',
          inboxProjectId: 99,
        },
      }),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
    };

    const response = await request(
      createTestApp(repository),
      '/api/auth/login',
      {
        method: 'POST',
        body: { identifier: 'Harvey@example.com', password: 'secure-password' },
      }
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      token: 'jwt-token',
      user: {
        id: 'user-123',
        username: 'harvey',
        email: 'harvey@example.com',
        timezone: 'Asia/Manila',
        inboxProjectId: 99,
      },
    });
    expect(repository.login).toHaveBeenCalledWith({
      identifier: 'Harvey@example.com',
      password: 'secure-password',
    });
  });

  it('returns the current user from a bearer token', async () => {
    const repository: AuthRepository = {
      isUsernameAvailable: vi.fn(),
      isEmailAvailable: vi.fn(),
      createUser: vi.fn(),
      login: vi.fn(),
      getCurrentUser: vi.fn().mockResolvedValue({
        id: 'user-123',
        username: 'harvey',
        email: 'harvey@example.com',
        timezone: 'Asia/Manila',
        inboxProjectId: 5,
      }),
      logout: vi.fn(),
    };

    const response = await request(createTestApp(repository), '/api/auth/me', {
      method: 'GET',
      headers: { Authorization: 'Bearer token-123' },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'user-123',
      username: 'harvey',
      email: 'harvey@example.com',
      timezone: 'Asia/Manila',
      inboxProjectId: 5,
    });
    expect(repository.getCurrentUser).toHaveBeenCalledWith('token-123');
  });

  it('logs out a valid user session', async () => {
    const repository: AuthRepository = {
      isUsernameAvailable: vi.fn(),
      isEmailAvailable: vi.fn(),
      createUser: vi.fn(),
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
    };

    const response = await request(
      createTestApp(repository),
      '/api/auth/logout',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token-123' },
      }
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Logged out successfully' });
    expect(repository.logout).toHaveBeenCalledWith('token-123');
  });

  it.each([
    [{ ...validSignup, username: 'x'.repeat(51) }, 'username'],
    [{ ...validSignup, email: 'not-an-email' }, 'email'],
    [
      { ...validSignup, password: 'short', confirmPassword: 'short' },
      'password',
    ],
    [
      { ...validSignup, confirmPassword: 'different-password' },
      'confirmPassword',
    ],
    [{ ...validSignup, timezone: 'Mars/Olympus' }, 'timezone'],
  ])('returns 400 for invalid signup input (%s)', async (body, field) => {
    const repository: AuthRepository = {
      isUsernameAvailable: vi.fn(),
      isEmailAvailable: vi.fn(),
      createUser: vi.fn(),
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
    };

    const response = await request(
      createTestApp(repository),
      '/api/auth/signup',
      {
        method: 'POST',
        body,
      }
    );

    expect(response.status).toBe(400);
    expect(repository.createUser).not.toHaveBeenCalled();
    expect(response.body).toMatchObject({
      details: [expect.objectContaining({ field })],
    });
  });

  it('rejects an already-used username before creating an account', async () => {
    const repository: AuthRepository = {
      isUsernameAvailable: vi.fn().mockResolvedValue(false),
      isEmailAvailable: vi.fn(),
      createUser: vi.fn(),
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
    };

    const response = await request(
      createTestApp(repository),
      '/api/auth/signup',
      {
        method: 'POST',
        body: validSignup,
      }
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Username is already in use' });
    expect(repository.isEmailAvailable).not.toHaveBeenCalled();
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('rejects an already-used email before creating an account', async () => {
    const repository: AuthRepository = {
      isUsernameAvailable: vi.fn().mockResolvedValue(true),
      isEmailAvailable: vi.fn().mockResolvedValue(false),
      createUser: vi.fn(),
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
    };

    const response = await request(
      createTestApp(repository),
      '/api/auth/signup',
      {
        method: 'POST',
        body: validSignup,
      }
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Email is already in use' });
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('checks username and email availability', async () => {
    const repository: AuthRepository = {
      isUsernameAvailable: vi.fn().mockResolvedValue(true),
      isEmailAvailable: vi.fn().mockResolvedValue(false),
      createUser: vi.fn(),
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
    };

    const app = createTestApp(repository);
    const username = await request(app, '/api/auth/check-username/harvey');
    const email = await request(
      app,
      '/api/auth/check-email/Harvey%40example.com'
    );

    expect(username).toMatchObject({ status: 200, body: { available: true } });
    expect(email).toMatchObject({ status: 200, body: { available: false } });
    expect(repository.isEmailAvailable).toHaveBeenCalledWith(
      'harvey@example.com'
    );
  });
});
