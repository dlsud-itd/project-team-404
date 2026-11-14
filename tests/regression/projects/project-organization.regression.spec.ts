import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request } from '../../../backend/tests/integration/helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('Project organization API regression', () => {
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

  it('organizes owned projects while preserving Inbox and cross-user isolation', async () => {
    if (!testSupabase) {
      throw new Error('Supabase integration test configuration is missing');
    }
    const owner = await registerAndLoginAs(app);
    const otherUser = await loginAs(app, testSupabase);
    const ownerAuth = { Authorization: `Bearer ${owner.token}` };
    const otherAuth = { Authorization: `Bearer ${otherUser.token}` };

    const first = await createProject(app, ownerAuth, 'First');
    const second = await createProject(app, ownerAuth, 'Second');
    const foreign = await createProject(app, otherAuth, 'Foreign');

    for (const isFavorite of [true, false, true]) {
      expect(
        (
          await request(app, `/api/projects/${first}/favorite`, {
            method: 'PUT',
            headers: ownerAuth,
            body: { isFavorite },
          })
        ).status
      ).toBe(200);
    }

    expect(
      (
        await request(app, `/api/projects/${first}/archive`, {
          method: 'PUT',
          headers: ownerAuth,
          body: { isArchived: true },
        })
      ).status
    ).toBe(200);
    expect(
      getProjectIds(
        (
          await request(app, '/api/projects?isArchived=true', {
            headers: ownerAuth,
          })
        ).body
      )
    ).toContain(first);
    expect(
      (
        await request(app, `/api/projects/${first}/archive`, {
          method: 'PUT',
          headers: ownerAuth,
          body: { isArchived: false },
        })
      ).status
    ).toBe(200);
    expect(
      getProjectIds(
        (
          await request(app, '/api/projects?isArchived=false', {
            headers: ownerAuth,
          })
        ).body
      )
    ).toContain(first);
    expect(
      (
        await request(app, `/api/projects/${first}/archive`, {
          method: 'PUT',
          headers: ownerAuth,
          body: { isArchived: true },
        })
      ).status
    ).toBe(200);
    expect(
      (
        await request(app, `/api/projects/${second}/sort-order`, {
          method: 'PUT',
          headers: ownerAuth,
          body: { sortOrder: 12 },
        })
      ).status
    ).toBe(200);

    const reordered = await request(app, '/api/projects/reorder', {
      method: 'PUT',
      headers: ownerAuth,
      body: { projectIds: [second, first] },
    });
    expect(reordered.status).toBe(200);
    expect(reordered.body).toMatchObject({
      projects: [
        { projectId: second, sortOrder: 0 },
        { projectId: first, sortOrder: 1 },
      ],
    });
    expect(
      getProjectIds(
        (await request(app, '/api/projects', { headers: ownerAuth })).body
      )
    ).toEqual([owner.inboxProjectId, second, first]);

    for (const [action, path, body] of [
      ['favorite', `/api/projects/${foreign}/favorite`, { isFavorite: true }],
      ['archive', `/api/projects/${foreign}/archive`, { isArchived: true }],
      ['sort order', `/api/projects/${foreign}/sort-order`, { sortOrder: 99 }],
    ] as const) {
      const response = await request(app, path, {
        method: 'PUT',
        headers: ownerAuth,
        body,
      });
      expect(response.status, `foreign project ${action}`).toBe(404);
    }

    const foreignReorder = await request(app, '/api/projects/reorder', {
      method: 'PUT',
      headers: ownerAuth,
      body: { projectIds: [foreign] },
    });
    expect(foreignReorder.status).toBe(404);

    const inboxArchive = await request(
      app,
      `/api/projects/${owner.inboxProjectId}/archive`,
      {
        method: 'PUT',
        headers: ownerAuth,
        body: { isArchived: true },
      }
    );
    expect(inboxArchive.status).toBe(409);

    const inboxSortOrder = await request(
      app,
      `/api/projects/${owner.inboxProjectId}/sort-order`,
      {
        method: 'PUT',
        headers: ownerAuth,
        body: { sortOrder: 99 },
      }
    );
    expect(inboxSortOrder.status).toBe(404);

    const inboxReorder = await request(app, '/api/projects/reorder', {
      method: 'PUT',
      headers: ownerAuth,
      body: { projectIds: [owner.inboxProjectId, first] },
    });
    expect(inboxReorder.status).toBe(404);

    const [ownerProjects, foreignProject, inboxes] = await Promise.all([
      prisma.project.findMany({
        where: { userId: owner.id, deletedAt: null },
        orderBy: [{ isInbox: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      }),
      prisma.project.findUniqueOrThrow({ where: { id: foreign } }),
      prisma.project.count({
        where: { userId: owner.id, isInbox: true, deletedAt: null },
      }),
    ]);
    expect(ownerProjects.map((project) => project.id)).toEqual([
      owner.inboxProjectId,
      second,
      first,
    ]);
    expect(ownerProjects[1]).toMatchObject({
      id: second,
      isFavorite: false,
      isArchived: false,
      sortOrder: 0,
    });
    expect(ownerProjects[2]).toMatchObject({
      id: first,
      isFavorite: true,
      isArchived: true,
      sortOrder: 1,
    });
    expect(foreignProject).toMatchObject({
      userId: otherUser.id,
      isFavorite: false,
      isArchived: false,
      sortOrder: 0,
    });
    expect(inboxes).toBe(1);
  });
});

async function createProject(
  app: (typeof import('../../../backend/src/app'))['app'],
  headers: Record<string, string>,
  name: string
): Promise<number> {
  const response = await request(app, '/api/projects', {
    method: 'POST',
    headers,
    body: { name },
  });
  if (
    response.status !== 201 ||
    typeof response.body !== 'object' ||
    response.body === null ||
    !('id' in response.body) ||
    typeof response.body.id !== 'number'
  ) {
    throw new Error(
      `Could not create regression project (HTTP ${response.status})`
    );
  }
  return response.body.id;
}

function getProjectIds(body: unknown): number[] {
  if (!Array.isArray(body)) {
    throw new Error('Expected project list response to be an array');
  }
  return body.map((project) => {
    if (
      typeof project !== 'object' ||
      project === null ||
      !('id' in project) ||
      typeof project.id !== 'number'
    ) {
      throw new Error('Expected each listed project to have a numeric id');
    }
    return project.id;
  });
}
