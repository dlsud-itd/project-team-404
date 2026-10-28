import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request } from '../../helpers/request';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  type IntegrationAccount,
} from '../../helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('projects integration', () => {
  let app: Express;
  let prisma: typeof import('../../../../src/shared/db/prisma.client').prisma;

  beforeAll(async () => {
    const [{ app: productionApp }, prismaModule] = await Promise.all([
      import('../../../../src/app'),
      import('../../../../src/shared/db/prisma.client'),
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

  async function seedProject(
    userId: string,
    values: {
      name: string;
      description?: string | null;
      color?: string | null;
      isInbox?: boolean;
      isArchived?: boolean;
      sortOrder?: number;
      deletedAt?: Date | null;
      updatedAt?: Date;
    }
  ) {
    return prisma.project.create({
      data: {
        userId,
        name: values.name,
        description: values.description,
        color: values.color,
        isInbox: values.isInbox,
        isArchived: values.isArchived,
        sortOrder: values.sortOrder,
        deletedAt: values.deletedAt,
        updatedAt: values.updatedAt,
      },
    });
  }

  function projectIds(body: unknown): number[] {
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
        throw new Error('Expected each project to include a numeric id');
      }
      return project.id;
    });
  }

  it('creates a project for the caller with the requested details and defaults', async () => {
    const account = await createAccount();
    const response = await request(app, '/api/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.token}` },
      body: {
        name: 'Research',
        description: 'Sprint planning notes',
        color: '#12ABEF',
      },
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Research',
      description: 'Sprint planning notes',
      color: '#12ABEF',
      isInbox: false,
      isFavorite: false,
      isArchived: false,
    });

    if (
      typeof response.body !== 'object' ||
      response.body === null ||
      !('id' in response.body) ||
      typeof response.body.id !== 'number'
    ) {
      throw new Error('Expected create response to include a project id');
    }
    const row = await prisma.project.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(row).toMatchObject({
      userId: account.id,
      name: 'Research',
      description: 'Sprint planning notes',
      color: '#12ABEF',
      isInbox: false,
      deletedAt: null,
    });
    const list = await request(app, '/api/projects', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(projectIds(list.body)).toContain(row.id);
  });

  it('rejects an is_inbox field rather than allowing callers to set system flags', async () => {
    const account = await createAccount();
    const before = await prisma.project.count({
      where: { userId: account.id },
    });

    const response = await request(app, '/api/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.token}` },
      body: { name: 'Not an Inbox', is_inbox: true },
    });

    expect(response.status).toBe(400);
    expect(await prisma.project.count({ where: { userId: account.id } })).toBe(
      before
    );
  });

  it.each([
    ['empty name', { name: '' }],
    ['name over 150 characters', { name: 'x'.repeat(151) }],
    ['invalid color', { name: 'Color test', color: 'blue' }],
  ])('rejects a project with %s', async (_label, body) => {
    const account = await createAccount();

    const response = await request(app, '/api/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.token}` },
      body,
    });

    expect(response.status).toBe(400);
  });

  it('lists only the caller’s active, archived, and Inbox projects with the requested filter', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const newUserList = await request(app, '/api/projects', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(projectIds(newUserList.body)).toEqual([account.inboxProjectId]);

    const active = await seedProject(account.id, {
      name: 'Active',
      sortOrder: 1,
    });
    const archived = await seedProject(account.id, {
      name: 'Archived',
      isArchived: true,
      sortOrder: 2,
    });
    const deleted = await seedProject(account.id, {
      name: 'Deleted',
      deletedAt: new Date(),
      sortOrder: 3,
    });
    const otherUserProject = await seedProject(otherAccount.id, {
      name: 'Other user project',
    });

    const all = await request(app, '/api/projects', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(all.status).toBe(200);
    expect(projectIds(all.body)).toEqual([
      account.inboxProjectId,
      active.id,
      archived.id,
    ]);
    expect(all.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: account.inboxProjectId,
          isInbox: true,
        }),
        expect.objectContaining({
          id: active.id,
          name: 'Active',
          description: null,
          color: null,
          isArchived: false,
        }),
      ])
    );
    expect(projectIds(all.body)).not.toContain(deleted.id);
    expect(projectIds(all.body)).not.toContain(otherUserProject.id);

    const activeOnly = await request(app, '/api/projects?isArchived=false', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(activeOnly.status).toBe(200);
    expect(projectIds(activeOnly.body)).toEqual([
      account.inboxProjectId,
      active.id,
    ]);

    const archivedOnly = await request(app, '/api/projects?isArchived=true', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(archivedOnly.status).toBe(200);
    expect(projectIds(archivedOnly.body)).toEqual([archived.id]);

    const invalidFilter = await request(app, '/api/projects?isArchived=abc', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(invalidFilter.status).toBe(400);
  });

  it('gets owned projects and hides other, missing, and invalid project IDs', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const ownProject = await seedProject(account.id, { name: 'My project' });
    const otherProject = await seedProject(otherAccount.id, {
      name: 'Their project',
    });

    const own = await request(app, `/api/projects/${ownProject.id}`, {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(own.status).toBe(200);
    expect(own.body).toMatchObject({ id: ownProject.id, name: 'My project' });

    const inbox = await request(
      app,
      `/api/projects/${account.inboxProjectId}`,
      { headers: { Authorization: `Bearer ${account.token}` } }
    );
    expect(inbox.status).toBe(200);
    expect(inbox.body).toMatchObject({
      id: account.inboxProjectId,
      isInbox: true,
    });

    const foreign = await request(app, `/api/projects/${otherProject.id}`, {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    const missing = await request(app, '/api/projects/2147483647', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    const invalid = await request(app, '/api/projects/not-a-number', {
      headers: { Authorization: `Bearer ${account.token}` },
    });

    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(400);
  });

  it('updates project details and rejects updates to another user’s project or the Inbox', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const baseline = new Date(Date.now() - 60_000);
    const ownProject = await seedProject(account.id, {
      name: 'Before update',
      description: 'Old description',
      color: '#123456',
      updatedAt: baseline,
    });
    const otherProject = await seedProject(otherAccount.id, {
      name: 'Other user project',
      description: 'Keep this description',
      color: '#ABCDEF',
    });
    const otherBefore = await prisma.project.findUniqueOrThrow({
      where: { id: otherProject.id },
    });
    const inboxBefore = await prisma.project.findUniqueOrThrow({
      where: { id: account.inboxProjectId },
    });

    const response = await request(app, `/api/projects/${ownProject.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${account.token}` },
      body: {
        name: 'After update',
        description: 'New description',
        color: '#654321',
      },
    });
    expect(response.status).toBe(200);
    expect(
      await prisma.project.findUniqueOrThrow({
        where: { id: ownProject.id },
      })
    ).toMatchObject({
      name: 'After update',
      description: 'New description',
      color: '#654321',
    });
    const updated = await prisma.project.findUniqueOrThrow({
      where: { id: ownProject.id },
    });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(baseline.getTime());

    const foreignUpdate = await request(
      app,
      `/api/projects/${otherProject.id}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${account.token}` },
        body: { name: 'Should not change' },
      }
    );
    expect(foreignUpdate.status).toBe(404);
    expect(
      await prisma.project.findUniqueOrThrow({
        where: { id: otherProject.id },
      })
    ).toEqual(otherBefore);

    const inboxUpdate = await request(
      app,
      `/api/projects/${account.inboxProjectId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${account.token}` },
        body: { name: 'Rename Inbox' },
      }
    );
    expect(inboxUpdate.status).toBe(403);
    expect(
      await prisma.project.findUniqueOrThrow({
        where: { id: account.inboxProjectId },
      })
    ).toEqual(inboxBefore);
  });

  it('soft-deletes owned projects and protects the Inbox and other users’ projects', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const ownProject = await seedProject(account.id, { name: 'Delete me' });
    const archivedProject = await seedProject(account.id, {
      name: 'Delete archived project',
      isArchived: true,
    });
    const otherProject = await seedProject(otherAccount.id, {
      name: 'Other user project',
    });
    const otherBefore = await prisma.project.findUniqueOrThrow({
      where: { id: otherProject.id },
    });
    const inboxBefore = await prisma.project.findUniqueOrThrow({
      where: { id: account.inboxProjectId },
    });
    const auth = { Authorization: `Bearer ${account.token}` };

    const deleted = await request(app, `/api/projects/${ownProject.id}`, {
      method: 'DELETE',
      headers: auth,
    });
    expect(deleted.status).toBe(204);
    const row = await prisma.project.findUniqueOrThrow({
      where: { id: ownProject.id },
    });
    expect(row.deletedAt).not.toBeNull();

    const archivedDelete = await request(
      app,
      `/api/projects/${archivedProject.id}`,
      { method: 'DELETE', headers: auth }
    );
    expect(archivedDelete.status).toBe(204);
    expect(
      (
        await prisma.project.findUniqueOrThrow({
          where: { id: archivedProject.id },
        })
      ).deletedAt
    ).not.toBeNull();

    const list = await request(app, '/api/projects', { headers: auth });
    expect(projectIds(list.body)).not.toContain(ownProject.id);
    expect(projectIds(list.body)).not.toContain(archivedProject.id);
    expect(
      (await request(app, `/api/projects/${ownProject.id}`, { headers: auth }))
        .status
    ).toBe(404);
    expect(
      (
        await request(app, `/api/projects/${ownProject.id}`, {
          method: 'DELETE',
          headers: auth,
        })
      ).status
    ).toBe(404);

    const inboxDelete = await request(
      app,
      `/api/projects/${account.inboxProjectId}`,
      { method: 'DELETE', headers: auth }
    );
    expect(inboxDelete.status).toBe(403);
    expect(
      await prisma.project.findUniqueOrThrow({
        where: { id: account.inboxProjectId },
      })
    ).toEqual(inboxBefore);

    const foreignDelete = await request(
      app,
      `/api/projects/${otherProject.id}`,
      { method: 'DELETE', headers: auth }
    );
    expect(foreignDelete.status).toBe(404);
    expect(
      await prisma.project.findUniqueOrThrow({
        where: { id: otherProject.id },
      })
    ).toEqual(otherBefore);

    const missingDelete = await request(app, '/api/projects/2147483647', {
      method: 'DELETE',
      headers: auth,
    });
    expect(missingDelete.status).toBe(404);
  });

  it('requires a valid token for every project CRUD route', async () => {
    const account = await createAccount();
    const routes = [
      {
        method: 'GET',
        path: '/api/projects',
      },
      {
        method: 'POST',
        path: '/api/projects',
        body: { name: 'Unauthorized project' },
      },
      {
        method: 'GET',
        path: `/api/projects/${account.inboxProjectId}`,
      },
      {
        method: 'PATCH',
        path: `/api/projects/${account.inboxProjectId}`,
        body: { name: 'Unauthorized update' },
      },
      {
        method: 'DELETE',
        path: `/api/projects/${account.inboxProjectId}`,
      },
    ];
    const authorizationHeaders: Record<string, string>[] = [
      {},
      { Authorization: 'Bearer invalid-token' },
    ];

    for (const route of routes) {
      for (const headers of authorizationHeaders) {
        const response = await request(app, route.path, {
          method: route.method,
          body: route.body,
          headers,
        });
        expect(response.status).toBe(401);
      }
    }
  });

  describe('project organization', () => {
    function organizationRequest(
      token: string | undefined,
      path: string,
      body: unknown,
      method = 'PUT'
    ) {
      return request(app, path, {
        method,
        body,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    }

    async function getSortOrders(projectIds: number[]) {
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, sortOrder: true },
        orderBy: { id: 'asc' },
      });
      return projects.map(({ id, sortOrder }) => ({ id, sortOrder }));
    }

    it('favorites and unfavorites repeatedly without changing the requested state', async () => {
      const account = await createAccount();
      const project = await seedProject(account.id, { name: 'Favorite me' });
      const path = `/api/projects/${project.id}/favorite`;

      for (const isFavorite of [true, true, false, false]) {
        const response = await organizationRequest(account.token, path, {
          isFavorite,
        });
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          projectId: project.id,
          isFavorite,
        });
        expect(
          (
            await prisma.project.findUniqueOrThrow({
              where: { id: project.id },
            })
          ).isFavorite
        ).toBe(isFavorite);
      }
    });

    it('archives and restores projects and rejects archiving the Inbox', async () => {
      const account = await createAccount();
      const project = await seedProject(account.id, { name: 'Archive me' });
      const auth = { Authorization: `Bearer ${account.token}` };
      const path = `/api/projects/${project.id}/archive`;

      const archived = await request(app, path, {
        method: 'PUT',
        headers: auth,
        body: { isArchived: true },
      });
      expect(archived.status).toBe(200);
      expect(
        (
          await prisma.project.findUniqueOrThrow({
            where: { id: project.id },
          })
        ).isArchived
      ).toBe(true);
      const archivedList = await request(app, '/api/projects?isArchived=true', {
        headers: auth,
      });
      expect(projectIds(archivedList.body)).toContain(project.id);
      const activeList = await request(app, '/api/projects?isArchived=false', {
        headers: auth,
      });
      expect(projectIds(activeList.body)).not.toContain(project.id);

      const unarchived = await request(app, path, {
        method: 'PUT',
        headers: auth,
        body: { isArchived: false },
      });
      expect(unarchived.status).toBe(200);
      expect(
        (
          await prisma.project.findUniqueOrThrow({
            where: { id: project.id },
          })
        ).isArchived
      ).toBe(false);
      const restoredList = await request(
        app,
        '/api/projects?isArchived=false',
        { headers: auth }
      );
      expect(projectIds(restoredList.body)).toContain(project.id);

      const inboxBefore = await prisma.project.findUniqueOrThrow({
        where: { id: account.inboxProjectId },
      });
      const inboxArchive = await request(
        app,
        `/api/projects/${account.inboxProjectId}/archive`,
        {
          method: 'PUT',
          headers: auth,
          body: { isArchived: true },
        }
      );
      expect(inboxArchive.status).toBe(400);
      expect(inboxArchive.body).toEqual({
        error: 'Inbox project cannot be archived',
      });
      expect(
        await prisma.project.findUniqueOrThrow({
          where: { id: account.inboxProjectId },
        })
      ).toEqual(inboxBefore);
    });

    it('hides another user’s project from favorite, archive, and reorder', async () => {
      const account = await createAccount();
      const otherAccount = await createAccount();
      const ownProject = await seedProject(account.id, {
        name: 'My organization project',
        sortOrder: 0,
      });
      const otherProject = await seedProject(otherAccount.id, {
        name: 'Other organization project',
        sortOrder: 0,
      });
      const otherBefore = await prisma.project.findUniqueOrThrow({
        where: { id: otherProject.id },
      });

      const favorite = await organizationRequest(
        account.token,
        `/api/projects/${otherProject.id}/favorite`,
        { isFavorite: true }
      );
      const archive = await organizationRequest(
        account.token,
        `/api/projects/${otherProject.id}/archive`,
        { isArchived: true }
      );
      const reorder = await organizationRequest(
        account.token,
        '/api/projects/reorder',
        { projectIds: [ownProject.id, otherProject.id] }
      );

      expect(favorite.status).toBe(404);
      expect(archive.status).toBe(404);
      expect(reorder.status).toBe(404);
      expect(
        await prisma.project.findUniqueOrThrow({
          where: { id: otherProject.id },
        })
      ).toEqual(otherBefore);
    });

    it('reorders projects, persists their sort order, and returns them in that order', async () => {
      const account = await createAccount();
      const first = await seedProject(account.id, {
        name: 'First',
        sortOrder: 0,
      });
      const second = await seedProject(account.id, {
        name: 'Second',
        sortOrder: 1,
      });
      const third = await seedProject(account.id, {
        name: 'Third',
        sortOrder: 2,
      });
      const requestedOrder = [third.id, first.id, second.id];

      const response = await organizationRequest(
        account.token,
        '/api/projects/reorder',
        { projectIds: requestedOrder }
      );
      expect(response.status).toBe(200);
      expect(
        (
          response.body as {
            projects: Array<{ projectId: number; sortOrder: number }>;
          }
        ).projects
      ).toEqual([
        { projectId: third.id, sortOrder: 0 },
        { projectId: first.id, sortOrder: 1 },
        { projectId: second.id, sortOrder: 2 },
      ]);

      const rows = await getSortOrders(requestedOrder);
      expect(rows).toEqual([
        { id: first.id, sortOrder: 1 },
        { id: second.id, sortOrder: 2 },
        { id: third.id, sortOrder: 0 },
      ]);
      const list = await request(app, '/api/projects', {
        headers: { Authorization: `Bearer ${account.token}` },
      });
      expect(projectIds(list.body)).toEqual([
        account.inboxProjectId,
        ...requestedOrder,
      ]);
    });

    it('rejects invalid reorder bodies and leaves project order unchanged', async () => {
      const account = await createAccount();
      const otherAccount = await createAccount();
      const first = await seedProject(account.id, {
        name: 'First',
        sortOrder: 0,
      });
      const second = await seedProject(account.id, {
        name: 'Second',
        sortOrder: 1,
      });
      const otherProject = await seedProject(otherAccount.id, {
        name: 'Other',
      });
      const projectIds = [first.id, second.id];
      const before = await getSortOrders(projectIds);

      for (const body of [
        { projectIds: 'not-an-array' },
        { projectIds: [] },
        { projectIds: [first.id, 1.5] },
      ]) {
        const response = await organizationRequest(
          account.token,
          '/api/projects/reorder',
          body
        );
        expect(response.status).toBe(400);
        expect(await getSortOrders(projectIds)).toEqual(before);
      }

      const duplicate = await organizationRequest(
        account.token,
        '/api/projects/reorder',
        { projectIds: [first.id, first.id] }
      );
      expect(duplicate.status).toBe(400);
      expect(duplicate.body).toMatchObject({
        error: 'Invalid project order',
      });
      expect(await getSortOrders(projectIds)).toEqual(before);

      const unknown = await organizationRequest(
        account.token,
        '/api/projects/reorder',
        { projectIds: [first.id, 2147483647] }
      );
      expect(unknown.status).toBe(404);
      expect(unknown.body).toEqual({ error: 'Project not found' });
      expect(await getSortOrders(projectIds)).toEqual(before);

      const otherUser = await organizationRequest(
        account.token,
        '/api/projects/reorder',
        { projectIds: [first.id, otherProject.id] }
      );
      expect(otherUser.status).toBe(404);
      expect(otherUser.body).toEqual({ error: 'Project not found' });
      expect(await getSortOrders(projectIds)).toEqual(before);
    });

    it('keeps concurrent reorder requests atomic and finishes with one complete order', async () => {
      const account = await createAccount();
      const first = await seedProject(account.id, {
        name: 'First',
        sortOrder: 0,
      });
      const second = await seedProject(account.id, {
        name: 'Second',
        sortOrder: 1,
      });
      const third = await seedProject(account.id, {
        name: 'Third',
        sortOrder: 2,
      });
      const orderA = [first.id, second.id, third.id];
      const orderB = [third.id, second.id, first.id];

      const [responseA, responseB] = await Promise.all([
        organizationRequest(account.token, '/api/projects/reorder', {
          projectIds: orderA,
        }),
        organizationRequest(account.token, '/api/projects/reorder', {
          projectIds: orderB,
        }),
      ]);
      expect(responseA.status).toBe(200);
      expect(responseB.status).toBe(200);

      const rows = await getSortOrders([first.id, second.id, third.id]);
      const actualOrder = rows
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(({ id }) => id);
      expect([orderA, orderB]).toContainEqual(actualOrder);
    });

    it('requires a valid token for favorite, archive, reorder, and sort-order routes', async () => {
      const account = await createAccount();
      const cases = [
        {
          path: `/api/projects/${account.inboxProjectId}/favorite`,
          body: { isFavorite: true },
        },
        {
          path: `/api/projects/${account.inboxProjectId}/archive`,
          body: { isArchived: true },
        },
        {
          path: '/api/projects/reorder',
          body: { projectIds: [account.inboxProjectId] },
        },
        {
          path: `/api/projects/${account.inboxProjectId}/sort-order`,
          body: { sortOrder: 1 },
        },
      ];

      for (const { path, body } of cases) {
        const response = await organizationRequest(undefined, path, body);
        expect(response.status).toBe(401);
      }
    });
  });
});
