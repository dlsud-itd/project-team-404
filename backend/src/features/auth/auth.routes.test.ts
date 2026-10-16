import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import { request } from '../../testing/helpers/request';
import { createAuthRouter } from './auth.routes';
import { SupabaseAuthRepository, type AuthRepository } from './auth.repository';

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
      createUser: vi.fn().mockResolvedValue({
        userId: 'user-123',
        inboxProjectId: 42,
      }),
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
    };

    const response = await request(
      createTestApp(repository),
      '/api/auth/signup',
      {
        method: 'POST',
        body: validSignup,
      }
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Username is already in use' });
    expect(repository.isEmailAvailable).not.toHaveBeenCalled();
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('rejects an already-used email before creating an account', async () => {
    const repository: AuthRepository = {
      isUsernameAvailable: vi.fn().mockResolvedValue(true),
      isEmailAvailable: vi.fn().mockResolvedValue(false),
      createUser: vi.fn(),
    };

    const response = await request(
      createTestApp(repository),
      '/api/auth/signup',
      {
        method: 'POST',
        body: validSignup,
      }
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email is already in use' });
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('checks username and email availability', async () => {
    const repository: AuthRepository = {
      isUsernameAvailable: vi.fn().mockResolvedValue(true),
      isEmailAvailable: vi.fn().mockResolvedValue(false),
      createUser: vi.fn(),
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

describe('SupabaseAuthRepository', () => {
  it('creates a Supabase Auth user, profile, and exactly one Inbox project', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal('fetch', async (input: URL, init: RequestInit = {}) => {
      const url = String(input);
      calls.push({ url, init });

      if (url.endsWith('/auth/v1/admin/users')) {
        return new Response(JSON.stringify({ id: 'user-123' }), {
          status: 200,
        });
      }
      if (url.endsWith('/rest/v1/tbl_user')) {
        return new Response(null, { status: 201 });
      }
      if (url.endsWith('/rest/v1/tbl_project')) {
        return new Response(JSON.stringify([{ project_id: 42 }]), {
          status: 201,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    try {
      const repository = new SupabaseAuthRepository(
        'https://project.example',
        'service-role-key'
      );
      const result = await repository.createUser({
        ...validSignup,
        email: 'harvey@example.com',
      });

      expect(result).toEqual({ userId: 'user-123', inboxProjectId: 42 });
      expect(calls).toHaveLength(3);
      expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
        email: 'harvey@example.com',
        password: 'secure-password',
        email_confirm: true,
      });
      expect(JSON.parse(String(calls[1]?.init.body))).toMatchObject({
        user_id: 'user-123',
        username: 'harvey',
        email: 'harvey@example.com',
        timezone: 'Asia/Manila',
      });
      expect(JSON.parse(String(calls[2]?.init.body))).toEqual({
        user_id: 'user-123',
        name: 'Inbox',
        is_inbox: true,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('returns a conflict if the Auth API detects a duplicate email after the availability check', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(
          JSON.stringify({
            code: 'email_exists',
            msg: 'A user with this email address has already been registered',
          }),
          { status: 422 }
        )
    );

    try {
      const repository = new SupabaseAuthRepository(
        'https://project.example',
        'service-role-key'
      );
      await expect(
        repository.createUser({
          ...validSignup,
          email: 'harvey@example.com',
        })
      ).rejects.toMatchObject({
        name: 'AuthConflictError',
        message: 'Email is already in use',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
