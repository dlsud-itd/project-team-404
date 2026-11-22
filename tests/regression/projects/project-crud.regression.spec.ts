import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request } from '../../../backend/tests/integration/helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('Project CRUD API regression', () => {
  type App = (typeof import('../../../backend/src/app'))['app'];
  let app: App;
  let prisma: typeof import('../../../backend/src/shared/db/prisma.client').prisma;

  beforeAll(async () => {
    const [{ app: productionApp }, prismaModule] = await Promise.all([
      import('../../../backend/src/app'),
      import('../../../backend/src/shared/db/prisma.client'),
    ]);
    app = productionApp;
    prisma = prismaModule.prisma;
  });

  afterEach(async () => {
    if (testSupabase) {
      await deleteIntegrationAccounts(testSupabase);
    }
  });

  it('preserves signup Inbox creation and completes project CRUD through the API', async () => {
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    const account = await registerAndLoginAs(app);

    expect(account.signupResult).toEqual({
      userId: account.id,
      inboxProjectId: expect.any(Number),
    });

    const inboxes = await prisma.project.findMany({
      where: { userId: account.id, isInbox: true, deletedAt: null },
    });
    expect(inboxes).toHaveLength(1);
    expect(inboxes[0]).toMatchObject({
      id: account.signupResult.inboxProjectId,
      name: 'Inbox',
      description: null,
      color: null,
      isInbox: true,
    });

    await expect(
      prisma.project.create({
        data: { userId: account.id, name: 'Second Inbox', isInbox: true },
      })
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.project.count({
        where: { userId: account.id, isInbox: true, deletedAt: null },
      })
    ).resolves.toBe(1);

    const auth = { Authorization: `Bearer ${account.token}` };
    const created = await request(app, '/api/projects', {
      method: 'POST',
      headers: auth,
      body: {
        name: 'Regression project',
        description: 'Created after the project field migrations',
        color: '#12ABEF',
      },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Regression project',
      description: 'Created after the project field migrations',
      color: '#12ABEF',
      isInbox: false,
    });
    const projectId = getProjectId(created.body);

    const listed = await request(app, '/api/projects', { headers: auth });
    expect(listed.status).toBe(200);
    expect(getProjectIds(listed.body)).toEqual([
      account.signupResult.inboxProjectId,
      projectId,
    ]);

    const updated = await request(app, `/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: auth,
      body: {
        name: 'Updated regression project',
        description: 'Description survives the migration',
        color: '#654321',
      },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: projectId,
      name: 'Updated regression project',
      description: 'Description survives the migration',
      color: '#654321',
    });

    const deleted = await request(app, `/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: auth,
    });
    expect(deleted.status).toBe(204);

    const afterDelete = await request(app, '/api/projects', { headers: auth });
    expect(afterDelete.status).toBe(200);
    expect(getProjectIds(afterDelete.body)).toEqual([
      account.signupResult.inboxProjectId,
    ]);
    expect(
      (await request(app, `/api/projects/${projectId}`, { headers: auth }))
        .status
    ).toBe(404);
  });
});

function getProjectId(body: unknown): number {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('id' in body) ||
    typeof body.id !== 'number'
  ) {
    throw new Error('Expected project response to include a numeric id');
  }
  return body.id;
}

function getProjectIds(body: unknown): number[] {
  if (!Array.isArray(body)) {
    throw new Error('Expected project list response to be an array');
  }
  return body.map(getProjectId);
}
