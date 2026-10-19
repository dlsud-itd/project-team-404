import { createHash } from 'node:crypto';
import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request } from '../helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  findSessionByTokenHash,
  loginAs,
  setSessionExpiry,
  type IntegrationAccount,
} from './supabase-test-support';

const testSupabase = configureSupabaseTest();

type LoginResponse = {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    timezone: string;
    inboxProjectId: number;
  };
};

const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('login and session integration', () => {
  let app: Express;
  let prisma: typeof import('../../shared/db/prisma.client').prisma;

  beforeAll(async () => {
    const [{ app: productionApp }, prismaModule] = await Promise.all([
      import('../../app'),
      import('../../shared/db/prisma.client'),
    ]);
    app = productionApp;
    prisma = prismaModule.prisma;
  });

  afterEach(async () => {
    if (testSupabase) {
      await deleteIntegrationAccounts(testSupabase);
    }
  });

  async function createAccount(): Promise<IntegrationAccount> {
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    return loginAs(app, testSupabase);
  }

  async function login(identifier: string, password: string) {
    return request(app, '/api/auth/login', {
      method: 'POST',
      body: { identifier, password },
    });
  }

  async function currentUser(token?: string) {
    return request(app, '/api/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  it.each([
    ['email', (account: IntegrationAccount) => account.email],
    ['username', (account: IntegrationAccount) => account.username],
    [
      'mixed-case email',
      (account: IntegrationAccount) => account.email.toUpperCase(),
    ],
  ])(
    'logs in with $0 and returns the database profile and Inbox',
    async (_label, getIdentifier) => {
      const account = await createAccount();
      const response = await login(getIdentifier(account), account.password);

      expect(response.status).toBe(200);
      const body = response.body as LoginResponse;
      expect(body.token).toEqual(expect.any(String));

      const row = await prisma.user.findUnique({
        where: { id: account.id },
        select: {
          id: true,
          username: true,
          email: true,
          timezone: true,
          projects: {
            where: { isInbox: true, deletedAt: null },
            select: { id: true },
          },
        },
      });
      expect(row).not.toBeNull();
      const inboxProject = row?.projects[0];
      if (
        !row?.email ||
        !row.timezone ||
        !inboxProject ||
        row.projects.length !== 1
      ) {
        throw new Error(
          'Expected integration account and its Inbox in test database'
        );
      }
      expect(body.user).toEqual({
        id: row.id,
        username: row.username,
        email: row.email.toLowerCase(),
        timezone: row.timezone,
        inboxProjectId: inboxProject.id,
      });
      expect(body.user.inboxProjectId).toBe(account.inboxProjectId);
    }
  );

  it('returns identical unauthorized responses for wrong password and unknown identifier', async () => {
    const account = await createAccount();
    const wrongPassword = await login(
      account.email,
      `${account.password}wrong`
    );
    const unknownIdentifier = await login(
      `missing_${account.username}`,
      account.password
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownIdentifier.status).toBe(401);
    expect(wrongPassword.body).toEqual({
      error: 'Invalid email or password',
    });
    expect(unknownIdentifier.body).toEqual(wrongPassword.body);
  });

  it.each([
    ['missing identifier', { password: 'a-password' }],
    ['empty password', { identifier: 'someone@example.test', password: '' }],
    [
      'identifier over 255 characters',
      { identifier: 'x'.repeat(256), password: 'a-password' },
    ],
  ])('returns a validation error for %s', async (_label, body) => {
    const response = await request(app, '/api/auth/login', {
      method: 'POST',
      body,
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'Invalid login details' });
  });

  it('does not allow a soft-deleted account to log in', async () => {
    const account = await createAccount();
    await prisma.user.update({
      where: { id: account.id },
      data: { deletedAt: new Date() },
    });

    const response = await login(account.email, account.password);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid email or password' });
  });

  it('updates last_login_at only after a successful login', async () => {
    const account = await createAccount();
    const baseline = new Date(Date.now() - 60_000);
    await prisma.user.update({
      where: { id: account.id },
      data: { lastLoginAt: baseline },
    });

    expect(
      (await login(account.email, `${account.password}wrong`)).status
    ).toBe(401);
    expect(
      (await login(`missing_${account.username}`, account.password)).status
    ).toBe(401);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: account.id } }))
        .lastLoginAt
    ).toEqual(baseline);

    expect((await login(account.email, account.password)).status).toBe(200);
    const updated = (
      await prisma.user.findUniqueOrThrow({ where: { id: account.id } })
    ).lastLoginAt;
    expect(updated).not.toBeNull();
    expect(updated!.getTime()).toBeGreaterThan(baseline.getTime());
  });

  it('returns the authenticated user and rejects missing, malformed, tampered, and expired tokens', async () => {
    const account = await createAccount();
    const valid = await currentUser(account.token);
    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({
      id: account.id,
      username: account.username,
      email: account.email.toLowerCase(),
      timezone: account.timezone,
      inboxProjectId: account.inboxProjectId,
    });

    const malformed = await request(app, '/api/auth/me', {
      headers: { Authorization: 'Basic invalid-token' },
    });
    const tamperedToken = account.token.endsWith('a')
      ? `${account.token.slice(0, -1)}b`
      : `${account.token.slice(0, -1)}a`;
    const tampered = await currentUser(tamperedToken);

    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    const tokenHash = createHash('sha256').update(account.token).digest('hex');
    await setSessionExpiry(
      testSupabase,
      tokenHash,
      new Date(Date.now() - 60_000)
    );
    const expired = await currentUser(account.token);

    for (const response of [
      await currentUser(),
      malformed,
      tampered,
      expired,
    ]) {
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Token invalid or expired' });
    }
  });

  it('revokes only the logged-out session and rejects repeated or unauthenticated logout', async () => {
    const account = await createAccount();
    const secondLogin = await login(account.email, account.password);
    expect(secondLogin.status).toBe(200);
    const secondToken = (secondLogin.body as LoginResponse).token;

    const logout = await request(app, '/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ message: 'Logged out successfully' });

    const firstSession = await currentUser(account.token);
    expect(firstSession.status).toBe(401);
    expect(firstSession.body).toEqual({ error: 'Token invalid or expired' });

    const repeatedLogout = await request(app, '/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(repeatedLogout.status).toBe(401);
    expect(repeatedLogout.body).toEqual({ error: 'Unauthorized' });

    const missingTokenLogout = await request(app, '/api/auth/logout', {
      method: 'POST',
    });
    expect(missingTokenLogout.status).toBe(401);
    expect(missingTokenLogout.body).toEqual({ error: 'Unauthorized' });

    const secondSession = await currentUser(secondToken);
    expect(secondSession.status).toBe(200);
    expect(secondSession.body).toMatchObject({ id: account.id });
  });

  it('stores only the hash of a session token', async () => {
    const account = await createAccount();
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    const tokenHash = createHash('sha256').update(account.token).digest('hex');

    const hashedSession = await findSessionByTokenHash(testSupabase, tokenHash);
    const rawTokenSession = await findSessionByTokenHash(
      testSupabase,
      account.token
    );

    expect(hashedSession).toEqual([
      { token_hash: tokenHash, user_id: account.id },
    ]);
    const storedSession = hashedSession[0];
    if (!storedSession) {
      throw new Error('Expected hashed integration session in test database');
    }
    expect(storedSession.token_hash).not.toBe(account.token);
    expect(rawTokenSession).toEqual([]);
  });
});
