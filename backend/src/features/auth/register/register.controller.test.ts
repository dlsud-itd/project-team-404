import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import { request } from '../../../../tests/integration/helpers/request';
import { RegisterService } from './register.service';
import { createRegisterController } from './register.controller';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { signupValidator } from './validators/signup.validator';

describe('register controller', () => {
  it('returns 201 with the created user and Inbox identifiers', async () => {
    const service = new RegisterService({
      isUsernameAvailable: vi.fn().mockResolvedValue(true),
      isEmailAvailable: vi.fn().mockResolvedValue(true),
      createAuthUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
      deleteAuthUser: vi.fn(),
      createUserProfile: vi.fn().mockResolvedValue(undefined),
      createInboxProject: vi.fn().mockResolvedValue(9),
    });
    const controller = createRegisterController(service);
    const app = express();
    app.use(express.json());
    app.post(
      '/signup',
      validateRequest(signupValidator, 'body', 'Invalid signup details'),
      controller.register
    );

    const result = await request(app, '/signup', {
      method: 'POST',
      body: {
        username: 'harvey',
        email: 'harvey@example.com',
        password: 'secure-password',
        confirmPassword: 'secure-password',
        timezone: 'Asia/Manila',
      },
    });
    expect(result.status).toBe(201);
    expect(result.body).toEqual({ userId: 'user-1', inboxProjectId: 9 });
  });
});
