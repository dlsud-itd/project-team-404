import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request, type TestResponse } from './helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  registerAndLoginAs,
  type IntegrationAccount,
} from './helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

type SettingsResponse = {
  dashboardTaskLimit: number;
  dashboardProjectLimit: number;
  fontSize: string;
  fontFamily: string;
  updatedAt: string;
};

integrationDescribe('settings integration', () => {
  let app: Express;
  let prisma: typeof import('../../src/shared/db/prisma.client').prisma;

  beforeAll(async () => {
    const [{ app: productionApp }, prismaModule] = await Promise.all([
      import('../../src/app'),
      import('../../src/shared/db/prisma.client'),
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

  async function settingsRequest(
    method: string,
    token?: string,
    body?: unknown
  ): Promise<TestResponse> {
    return request(app, '/api/settings', {
      method,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      ...(body === undefined ? {} : { body }),
    });
  }

  function settingsBody(body: unknown): SettingsResponse {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('dashboardTaskLimit' in body) ||
      typeof body.dashboardTaskLimit !== 'number' ||
      !('dashboardProjectLimit' in body) ||
      typeof body.dashboardProjectLimit !== 'number' ||
      !('fontSize' in body) ||
      typeof body.fontSize !== 'string' ||
      !('fontFamily' in body) ||
      typeof body.fontFamily !== 'string' ||
      !('updatedAt' in body) ||
      typeof body.updatedAt !== 'string'
    ) {
      throw new Error('Expected settings response to include all preferences');
    }
    return {
      dashboardTaskLimit: body.dashboardTaskLimit,
      dashboardProjectLimit: body.dashboardProjectLimit,
      fontSize: body.fontSize,
      fontFamily: body.fontFamily,
      updatedAt: body.updatedAt,
    };
  }

  it('creates default settings for a newly registered account when the row is missing', async () => {
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    const account = await registerAndLoginAs(app);
    await prisma.userSetting.deleteMany({ where: { userId: account.id } });
    expect(
      await prisma.userSetting.findUnique({ where: { userId: account.id } })
    ).toBeNull();

    const response = await settingsRequest('GET', account.token);
    expect(response.status).toBe(200);
    expect(settingsBody(response.body)).toMatchObject({
      dashboardTaskLimit: 5,
      dashboardProjectLimit: 5,
      fontSize: 'medium',
      fontFamily: 'system',
    });
    expect(
      await prisma.userSetting.findUnique({ where: { userId: account.id } })
    ).toMatchObject({
      dashboardTaskLimit: 5,
      dashboardProjectLimit: 5,
      fontSize: 'medium',
      fontFamily: 'system',
    });
  });

  it('patches each setting independently and all fields together with updatedAt changes', async () => {
    const account = await createAccount();
    const defaults = await settingsRequest('GET', account.token);
    expect(defaults.status).toBe(200);

    const updates = [
      {
        body: { dashboardTaskLimit: 12 },
        key: 'dashboardTaskLimit',
        value: 12,
      },
      {
        body: { dashboardProjectLimit: 13 },
        key: 'dashboardProjectLimit',
        value: 13,
      },
      { body: { fontSize: 'large' }, key: 'fontSize', value: 'large' },
      { body: { fontFamily: 'serif' }, key: 'fontFamily', value: 'serif' },
    ] as const;
    for (const update of updates) {
      const before = await prisma.userSetting.findUniqueOrThrow({
        where: { userId: account.id },
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      const response = await settingsRequest(
        'PATCH',
        account.token,
        update.body
      );
      expect(response.status).toBe(200);
      const result = settingsBody(response.body);
      expect(result[update.key]).toBe(update.value);
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(
        before.updatedAt.getTime()
      );
    }

    const beforeAllFields = await prisma.userSetting.findUniqueOrThrow({
      where: { userId: account.id },
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    const allFields = await settingsRequest('PATCH', account.token, {
      dashboardTaskLimit: 18,
      dashboardProjectLimit: 19,
      fontSize: 'x-large',
      fontFamily: 'atkinson-hyperlegible',
    });
    expect(allFields.status).toBe(200);
    expect(settingsBody(allFields.body)).toMatchObject({
      dashboardTaskLimit: 18,
      dashboardProjectLimit: 19,
      fontSize: 'x-large',
      fontFamily: 'atkinson-hyperlegible',
    });
    expect(
      new Date(settingsBody(allFields.body).updatedAt).getTime()
    ).toBeGreaterThan(beforeAllFields.updatedAt.getTime());
  });

  it('keeps preferences isolated between accounts', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const ownInitial = await settingsRequest('GET', account.token);
    const otherInitial = await settingsRequest('GET', otherAccount.token);
    expect(ownInitial.status).toBe(200);
    expect(otherInitial.status).toBe(200);
    const otherSettingsBefore = settingsBody(otherInitial.body);

    const update = await settingsRequest('PATCH', account.token, {
      dashboardTaskLimit: 1,
      dashboardProjectLimit: 2,
      fontSize: 'small',
      fontFamily: 'monospace',
    });
    expect(update.status).toBe(200);

    const otherAfter = await settingsRequest('GET', otherAccount.token);
    expect(otherAfter.status).toBe(200);
    expect(settingsBody(otherAfter.body)).toEqual(otherSettingsBefore);
    expect(
      await prisma.userSetting.findUniqueOrThrow({
        where: { userId: otherAccount.id },
      })
    ).toMatchObject({
      dashboardTaskLimit: 5,
      dashboardProjectLimit: 5,
      fontSize: 'medium',
      fontFamily: 'system',
    });
  });

  it('rejects invalid limits, preferences, unknown fields, and empty patches', async () => {
    const account = await createAccount();
    const invalidBodies = [
      { dashboardTaskLimit: 0 },
      { dashboardTaskLimit: 51 },
      { dashboardProjectLimit: 0 },
      { dashboardProjectLimit: 51 },
      { fontSize: 'huge' },
      { fontFamily: 'comic-sans' },
      { unexpected: true },
      {},
    ];

    for (const body of invalidBodies) {
      const response = await settingsRequest('PATCH', account.token, body);
      expect(response.status).toBe(400);
    }
  });

  it('requires authentication for settings reads and updates', async () => {
    const account = await createAccount();
    expect((await settingsRequest('GET')).status).toBe(401);
    expect(
      (await settingsRequest('PATCH', undefined, { fontSize: 'large' })).status
    ).toBe(401);
    expect((await settingsRequest('GET', 'invalid-token')).status).toBe(401);
    expect(
      (
        await settingsRequest('PATCH', 'invalid-token', {
          dashboardTaskLimit: 10,
        })
      ).status
    ).toBe(401);
    expect(
      await prisma.userSetting.findUnique({
        where: { userId: account.id },
      })
    ).toBeNull();
  });
});
