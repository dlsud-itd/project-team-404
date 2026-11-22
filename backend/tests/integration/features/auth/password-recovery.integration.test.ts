import { createHash, randomBytes } from 'node:crypto';
import express, { type Express } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Mailer,
  MailMessage,
} from '../../../../src/features/auth/forgot-password/mailer/mailer';
import { errorHandler } from '../../../../src/middleware/error-handler.middleware';
import { request } from '../../helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  findPasswordResetTokens,
  loginAs,
  setPasswordResetTokenState,
  type IntegrationAccount,
  type TestSupabaseConfig,
} from '../../helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });
const integrationDescribe = testSupabase ? describe : describe.skip;
const forgotPasswordMessage =
  'If an account exists for that email, a reset link has been sent.';
const resetPasswordMessage = 'Password updated successfully.';
const replayedResetMessage = 'This reset link is invalid or has expired.';

class InMemoryMailer implements Mailer {
  readonly messages: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.messages.push(message);
  }
}

integrationDescribe('password recovery integration', () => {
  let app: Express;
  let mailer: InMemoryMailer;
  let account: IntegrationAccount;
  let config: TestSupabaseConfig;

  beforeEach(async () => {
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    config = testSupabase;
    mailer = new InMemoryMailer();
    const { createAuthRouter } =
      await import('../../../../src/features/auth/auth.routes');
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter({ mailer }));
    app.use(errorHandler);
    account = await loginAs(app, config);
  });

  afterEach(async () => {
    if (testSupabase) {
      await deleteIntegrationAccounts(testSupabase);
    }
  });

  async function requestReset(email = account.email) {
    return request(app, '/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }

  async function login(email: string, password: string) {
    return request(app, '/api/auth/login', {
      method: 'POST',
      body: { identifier: email, password },
    });
  }

  async function me(token: string) {
    return request(app, '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  function tokenFromLatestEmail(): string {
    const message = mailer.messages.at(-1);
    if (!message) {
      throw new Error('Expected a reset email to be captured');
    }
    const match = /https?:\/\/[^\s<"]+/.exec(message.text);
    if (!match) {
      throw new Error('Captured reset email did not contain a reset link');
    }
    const token = new URL(match[0]).searchParams.get('token');
    if (!token) {
      throw new Error('Captured reset link did not contain a token');
    }
    return token;
  }

  async function rowsForAccount() {
    return findPasswordResetTokens(config, account.id);
  }

  async function validateToken(token: string) {
    return request(
      app,
      `/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`
    );
  }

  async function resetPassword(
    token: string,
    newPassword: string,
    confirmPassword = newPassword
  ) {
    return request(app, '/api/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword, confirmPassword },
    });
  }

  it('creates a hashed, expiring reset token and captures the reset email', async () => {
    const beforeRequest = Date.now();
    const response = await requestReset();
    const afterRequest = Date.now();
    const rows = await rowsForAccount();
    const token = tokenFromLatestEmail();
    const tokenHash = createHash('sha256').update(token).digest('hex');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: forgotPasswordMessage });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: account.id,
      token_hash: tokenHash,
      used_at: null,
    });
    expect(rows[0]?.token_hash).not.toBe(token);
    expect(rows[0]?.expires_at).toBeDefined();
    const expiry = new Date(rows[0]!.expires_at).getTime();
    expect(expiry).toBeGreaterThanOrEqual(beforeRequest + 60 * 60 * 1000);
    expect(expiry).toBeLessThanOrEqual(afterRequest + 60 * 60 * 1000);

    expect(mailer.messages).toHaveLength(1);
    expect(mailer.messages[0]?.to).toBe(account.email);
    expect(mailer.messages[0]?.text).toContain('/reset-password?token=');
    expect(mailer.messages[0]?.text).toContain(encodeURIComponent(token));
  });

  it('returns the same response for unknown email and rejects invalid email', async () => {
    const unknown = await requestReset('missing_integration@example.test');
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({ message: forgotPasswordMessage });
    expect(await rowsForAccount()).toEqual([]);
    expect(mailer.messages).toEqual([]);

    const invalid = await requestReset('not-an-email');
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ error: 'Invalid email address' });
    expect(await rowsForAccount()).toEqual([]);
    expect(mailer.messages).toEqual([]);
  });

  it('invalidates the earlier token when a second reset is requested', async () => {
    expect((await requestReset()).status).toBe(200);
    const firstToken = tokenFromLatestEmail();
    expect((await requestReset()).status).toBe(200);
    const secondToken = tokenFromLatestEmail();
    const rows = await rowsForAccount();
    const firstHash = createHash('sha256').update(firstToken).digest('hex');
    const secondHash = createHash('sha256').update(secondToken).digest('hex');

    expect(rows).toHaveLength(2);
    expect(
      rows.find((row) => row.token_hash === firstHash)?.used_at
    ).not.toBeNull();
    expect(
      rows.find((row) => row.token_hash === secondHash)?.used_at
    ).toBeNull();
    expect(secondToken).not.toBe(firstToken);
    expect(mailer.messages).toHaveLength(2);
  });

  it('validates fresh, unknown, expired, used, and missing reset tokens', async () => {
    expect((await requestReset()).status).toBe(200);
    const freshToken = tokenFromLatestEmail();
    const fresh = await validateToken(freshToken);
    expect(fresh.status).toBe(200);
    expect(fresh.body).toEqual({ valid: true });

    const missing = await request(app, '/api/auth/validate-reset-token');
    expect(missing.status).toBe(400);
    expect(missing.body).toMatchObject({
      error: 'A valid reset token is required',
    });

    const unknown = await validateToken(randomBytes(32).toString('base64url'));
    expect(unknown.status).toBe(400);
    expect(unknown.body).toMatchObject({
      error: 'Reset token is invalid',
      reason: 'invalid',
    });

    expect((await requestReset()).status).toBe(200);
    const expiredToken = tokenFromLatestEmail();
    const expiredHash = createHash('sha256').update(expiredToken).digest('hex');
    await setPasswordResetTokenState(config, expiredHash, {
      expiresAt: new Date(Date.now() - 60_000),
    });
    const expired = await validateToken(expiredToken);
    expect(expired.status).toBe(400);
    expect(expired.body).toMatchObject({
      error: 'Reset token is invalid',
      reason: 'expired',
    });

    expect((await requestReset()).status).toBe(200);
    const usedToken = tokenFromLatestEmail();
    const usedHash = createHash('sha256').update(usedToken).digest('hex');
    await setPasswordResetTokenState(config, usedHash, {
      usedAt: new Date(),
    });
    const used = await validateToken(usedToken);
    expect(used.status).toBe(400);
    expect(used.body).toMatchObject({
      error: 'Reset token is invalid',
      reason: 'used',
    });
  });

  it('resets password, marks token used, and revokes the prior session', async () => {
    expect((await requestReset()).status).toBe(200);
    const token = tokenFromLatestEmail();
    const newPassword = `new-${randomBytes(16).toString('base64url')}`;

    const reset = await resetPassword(token, newPassword);
    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ message: resetPasswordMessage });

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const rows = await rowsForAccount();
    const resetRow = rows.find((row) => row.token_hash === tokenHash);
    expect(resetRow).toBeDefined();
    expect(resetRow?.used_at).not.toBeNull();
    expect((await login(account.email, newPassword)).status).toBe(200);
    expect((await login(account.email, account.password)).status).toBe(401);

    const oldSession = await me(account.token);
    expect(oldSession.status).toBe(401);
    expect(oldSession.body).toEqual({ error: 'Token invalid or expired' });

    const replay = await resetPassword(token, newPassword);
    expect(replay.status).toBe(400);
    expect(replay.body).toEqual({ error: replayedResetMessage });
  });

  it('rejects invalid reset details and expired or unknown tokens without changing the old password', async () => {
    expect((await requestReset()).status).toBe(200);
    const token = tokenFromLatestEmail();
    const mismatch = await resetPassword(
      token,
      `new-${randomBytes(16).toString('base64url')}`,
      'different-password'
    );
    expect(mismatch.status).toBe(400);
    expect(mismatch.body).toMatchObject({ error: 'Invalid reset details' });

    const tooShort = await resetPassword(token, 'short');
    expect(tooShort.status).toBe(400);
    expect(tooShort.body).toMatchObject({ error: 'Invalid reset details' });
    expect((await validateToken(token)).body).toEqual({ valid: true });

    const tokenHash = createHash('sha256').update(token).digest('hex');
    await setPasswordResetTokenState(config, tokenHash, {
      expiresAt: new Date(Date.now() - 60_000),
    });
    const expired = await resetPassword(
      token,
      `expired-${randomBytes(16).toString('base64url')}`
    );
    expect(expired.status).toBe(400);
    expect((expired.body as { error?: string }).error).toBe(
      replayedResetMessage
    );

    const unknown = await resetPassword(
      randomBytes(32).toString('base64url'),
      `unknown-${randomBytes(16).toString('base64url')}`
    );
    expect(unknown.status).toBe(400);
    expect((unknown.body as { error?: string }).error).toBe(
      replayedResetMessage
    );
    expect((await login(account.email, account.password)).status).toBe(200);
    expect((await me(account.token)).status).toBe(200);
  });
});
