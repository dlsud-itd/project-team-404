import { createHash } from 'node:crypto';
import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request } from '../helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  setSessionExpiry,
  type IntegrationAccount,
} from './supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('profile integration', () => {
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

  function updateMe(
    token: string | undefined,
    body: unknown,
    authorization?: string
  ) {
    return request(app, '/api/auth/me', {
      method: 'PUT',
      body,
      headers: authorization
        ? { Authorization: authorization }
        : token
          ? { Authorization: `Bearer ${token}` }
          : {},
    });
  }

  function getMe(token: string) {
    return request(app, '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async function findUser(id: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  it('persists a new username and returns it from GET /me', async () => {
    const account = await createAccount();
    const baseline = new Date(Date.now() - 60_000);
    await prisma.user.update({
      where: { id: account.id },
      data: { updatedAt: baseline },
    });

    const response = await updateMe(account.token, {
      username: `renamed_${account.username}`,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: account.id,
      username: `renamed_${account.username}`,
    });

    const row = await findUser(account.id);
    expect(row.username).toBe(`renamed_${account.username}`);
    expect(row.updatedAt.getTime()).toBeGreaterThan(baseline.getTime());
    expect(await getMe(account.token)).toMatchObject({
      status: 200,
      body: expect.objectContaining({
        id: account.id,
        username: `renamed_${account.username}`,
      }),
    });
  });

  it('saves a valid IANA timezone and rejects an invalid timezone', async () => {
    const account = await createAccount();

    const valid = await updateMe(account.token, { timezone: 'Europe/London' });
    expect(valid.status).toBe(200);
    expect((await findUser(account.id)).timezone).toBe('Europe/London');

    const invalid = await updateMe(account.token, {
      timezone: 'Mars/Olympus',
    });
    expect(invalid.status).toBe(400);
    expect((await findUser(account.id)).timezone).toBe('Europe/London');
  });

  it('updates either profile field without changing the other', async () => {
    const account = await createAccount();
    const originalUsername = account.username;

    const timezoneUpdate = await updateMe(account.token, {
      timezone: 'Europe/London',
    });
    expect(timezoneUpdate.status).toBe(200);
    expect(await findUser(account.id)).toMatchObject({
      username: originalUsername,
      timezone: 'Europe/London',
    });

    const usernameUpdate = await updateMe(account.token, {
      username: `renamed_${originalUsername}`,
    });
    expect(usernameUpdate.status).toBe(200);
    expect(await findUser(account.id)).toMatchObject({
      username: `renamed_${originalUsername}`,
      timezone: 'Europe/London',
    });
  });

  it('rejects another account’s username without changing either row and accepts its own', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const before = await findUser(account.id);
    const otherBefore = await findUser(otherAccount.id);

    const conflict = await updateMe(account.token, {
      username: otherAccount.username,
    });
    expect(conflict.status).toBe(400);
    expect(await findUser(account.id)).toEqual(before);
    expect(await findUser(otherAccount.id)).toEqual(otherBefore);

    const ownUsername = await updateMe(account.token, {
      username: account.username,
    });
    expect(ownUsername.status).toBe(200);
    expect((await findUser(account.id)).username).toBe(account.username);
  });

  it.each([
    ['empty', ''],
    ['over 50 characters', 'x'.repeat(51)],
  ])('rejects a username that is %s', async (_label, username) => {
    const account = await createAccount();
    const before = await findUser(account.id);

    const response = await updateMe(account.token, { username });

    expect(response.status).toBe(400);
    expect(await findUser(account.id)).toEqual(before);
  });

  it('strips or rejects system fields without changing the account', async () => {
    const account = await createAccount();
    const before = await findUser(account.id);

    const response = await updateMe(account.token, {
      id: 'attacker-id',
      user_id: 'another-user-id',
      email: 'attacker@example.test',
      created_at: new Date(0).toISOString(),
    });

    expect(response.status).toBe(400);
    expect(await findUser(account.id)).toEqual(before);
  });

  it('uses the bearer token identity rather than a supplied user_id', async () => {
    const accountA = await createAccount();
    const accountB = await createAccount();
    const accountBBefore = await findUser(accountB.id);
    const username = `renamed_${accountA.username}`;

    const response = await updateMe(accountA.token, {
      user_id: accountB.id,
      username,
    });

    expect(response.status).toBe(200);
    expect((await findUser(accountA.id)).username).toBe(username);
    expect(await findUser(accountB.id)).toEqual(accountBBefore);
  });

  it('rejects missing, malformed, expired, and logged-out bearer tokens', async () => {
    const account = await createAccount();
    const missing = await updateMe(undefined, { timezone: 'Europe/London' });
    const malformed = await updateMe(
      undefined,
      { timezone: 'Europe/London' },
      'Basic invalid-token'
    );

    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    const tokenHash = createHash('sha256').update(account.token).digest('hex');
    await setSessionExpiry(
      testSupabase,
      tokenHash,
      new Date(Date.now() - 60_000)
    );
    const expired = await updateMe(account.token, {
      timezone: 'Europe/London',
    });

    const loggedOutAccount = await createAccount();
    const logout = await request(app, '/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${loggedOutAccount.token}` },
    });
    expect(logout.status).toBe(200);
    const loggedOut = await updateMe(loggedOutAccount.token, {
      timezone: 'Europe/London',
    });

    for (const response of [missing, malformed, expired, loggedOut]) {
      expect(response.status).toBe(401);
    }
  });

  it('allows exactly one of two concurrent requests to claim a username', async () => {
    const accountA = await createAccount();
    const accountB = await createAccount();
    const sharedUsername = `shared_${accountA.username}`;
    const [responseA, responseB] = await Promise.all([
      updateMe(accountA.token, { username: sharedUsername }),
      updateMe(accountB.token, { username: sharedUsername }),
    ]);

    expect(
      [responseA.status, responseB.status].filter((status) => status === 200)
    ).toHaveLength(1);
    expect(
      [responseA.status, responseB.status].filter((status) => status === 400)
    ).toHaveLength(1);

    const [rowA, rowB] = await Promise.all([
      findUser(accountA.id),
      findUser(accountB.id),
    ]);
    expect(
      [rowA.username, rowB.username].filter(
        (username) => username === sharedUsername
      )
    ).toHaveLength(1);
  });
});
