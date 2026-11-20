import type { Express } from 'express';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { request, type TestResponse } from './helpers/request';
import {
  configureSupabaseTest,
  defaultPriorityIdFor,
  deleteIntegrationAccounts,
  loginAs,
  type IntegrationAccount,
} from './helpers/supabase-test-support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

type SearchItem = {
  id: number;
  title?: string;
  name?: string;
  matchedField: 'title' | 'description' | 'name';
  snippet: string;
  isArchived: boolean;
  archivedAt: string | null;
};

type SearchGroup = {
  items: SearchItem[];
  total: number;
};

type SearchResponse = {
  tasks: SearchGroup;
  projects: SearchGroup;
};

integrationDescribe('search integration', () => {
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

  async function searchRequest(
    query: Record<string, string>,
    token?: string
  ): Promise<TestResponse> {
    const params = new URLSearchParams(query);
    return request(app, `/api/search?${params}`, {
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    });
  }

  async function seedProject(
    userId: string,
    values: {
      name: string;
      description?: string | null;
      isArchived?: boolean;
      archivedAt?: Date | null;
      deletedAt?: Date | null;
      updatedAt?: Date;
    }
  ) {
    return prisma.project.create({
      data: {
        userId,
        name: values.name,
        description: values.description,
        isArchived: values.isArchived,
        archivedAt:
          values.archivedAt !== undefined
            ? values.archivedAt
            : values.isArchived
              ? new Date()
              : null,
        deletedAt: values.deletedAt,
        updatedAt: values.updatedAt,
      },
    });
  }

  async function seedTask(
    userId: string,
    projectId: number,
    values: {
      title: string;
      description?: string | null;
      archivedAt?: Date | null;
      deletedAt?: Date | null;
      updatedAt?: Date;
    }
  ) {
    return prisma.task.create({
      data: {
        userId,
        projectId,
        priorityId: await defaultPriorityIdFor(userId),
        title: values.title,
        description: values.description,
        archivedAt: values.archivedAt,
        deletedAt: values.deletedAt,
        updatedAt: values.updatedAt,
      },
    });
  }

  function searchBody(body: unknown): SearchResponse {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('tasks' in body) ||
      !('projects' in body)
    ) {
      throw new Error(
        'Expected search response to include task and project groups'
      );
    }
    return body as SearchResponse;
  }

  function itemIds(items: SearchItem[]): number[] {
    return items.map(({ id }) => id);
  }

  it('finds title and description matches once with the matching field and snippet', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'Quarterly search fixtures',
    });
    const titleMatch = await seedTask(account.id, project.id, {
      title: 'Review quarterly dossier',
    });
    const descriptionMatch = await seedTask(account.id, project.id, {
      title: 'Friday review notes',
      description:
        'The compliance team must review the quarterly dossier before Friday.',
    });

    const response = await searchRequest(
      { q: 'quarterly dossier', type: 'tasks' },
      account.token
    );
    expect(response.status).toBe(200);
    const results = searchBody(response.body);
    expect(results.tasks.total).toBe(2);
    expect(itemIds(results.tasks.items)).toHaveLength(2);
    expect(results.tasks.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: titleMatch.id,
          matchedField: 'title',
          snippet: 'Review quarterly dossier',
        }),
        expect.objectContaining({
          id: descriptionMatch.id,
          matchedField: 'description',
          snippet: expect.stringContaining('quarterly dossier'),
        }),
      ])
    );
    expect(results.projects).toEqual({ items: [], total: 0 });
  });

  it('finds matching project names and descriptions', async () => {
    const account = await createAccount();
    const nameMatch = await seedProject(account.id, {
      name: 'Quarterly compliance',
    });
    const descriptionMatch = await seedProject(account.id, {
      name: 'Audit workspace',
      description: 'Workspace for quarterly compliance reviews.',
    });

    const response = await searchRequest(
      { q: 'quarterly compliance', type: 'projects' },
      account.token
    );
    expect(response.status).toBe(200);
    const results = searchBody(response.body);
    expect(results.projects.total).toBe(2);
    expect(results.projects.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: nameMatch.id,
          matchedField: 'name',
          snippet: 'Quarterly compliance',
        }),
        expect.objectContaining({
          id: descriptionMatch.id,
          matchedField: 'description',
          snippet: expect.stringContaining('quarterly compliance'),
        }),
      ])
    );
    expect(results.tasks).toEqual({ items: [], total: 0 });
  });

  it('matches case-insensitively, including accented text', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'Accented search fixtures',
    });
    const task = await seedTask(account.id, project.id, {
      title: 'Café schedule',
    });

    const response = await searchRequest(
      { q: 'CAFÉ', type: 'tasks' },
      account.token
    );
    expect(response.status).toBe(200);
    const results = searchBody(response.body);
    expect(results.tasks.total).toBe(1);
    expect(results.tasks.items).toMatchObject([
      {
        id: task.id,
        matchedField: 'title',
        snippet: 'Café schedule',
      },
    ]);
  });

  it('ranks exact title matches before starts-with and contains matches', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'Search ranking fixtures',
    });
    const exact = await seedTask(account.id, project.id, {
      title: 'orbit',
    });
    const startsWith = await seedTask(account.id, project.id, {
      title: 'orbit planning',
    });
    const contains = await seedTask(account.id, project.id, {
      title: 'Plan around orbit',
    });

    const response = await searchRequest(
      { q: 'orbit', type: 'tasks' },
      account.token
    );
    expect(response.status).toBe(200);
    expect(itemIds(searchBody(response.body).tasks.items)).toEqual([
      exact.id,
      startsWith.id,
      contains.id,
    ]);
  });

  it('limits each group and returns only the selected type', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'limitmatch project one',
    });
    const secondProject = await seedProject(account.id, {
      name: 'limitmatch project two',
    });
    const thirdProject = await seedProject(account.id, {
      name: 'limitmatch project three',
    });
    const tasks = await Promise.all(
      [
        'limitmatch task one',
        'limitmatch task two',
        'limitmatch task three',
      ].map((title) => seedTask(account.id, project.id, { title }))
    );
    const projects = [project, secondProject, thirdProject];

    const all = await searchRequest(
      { q: 'limitmatch', limit: '2' },
      account.token
    );
    expect(all.status).toBe(200);
    const allResults = searchBody(all.body);
    expect(allResults.tasks.items).toHaveLength(2);
    expect(allResults.tasks.total).toBe(3);
    expect(allResults.projects.items).toHaveLength(2);
    expect(allResults.projects.total).toBe(3);

    const tasksOnly = await searchRequest(
      { q: 'limitmatch', type: 'tasks', limit: '2' },
      account.token
    );
    expect(tasksOnly.status).toBe(200);
    expect(searchBody(tasksOnly.body)).toMatchObject({
      tasks: {
        total: 3,
      },
      projects: {
        items: [],
        total: 0,
      },
    });
    expect(searchBody(tasksOnly.body).tasks.items).toHaveLength(2);
    expect(
      itemIds(searchBody(tasksOnly.body).tasks.items).every((taskId) =>
        tasks.some((task) => task.id === taskId)
      )
    ).toBe(true);

    const projectsOnly = await searchRequest(
      { q: 'limitmatch', type: 'projects', limit: '2' },
      account.token
    );
    expect(projectsOnly.status).toBe(200);
    expect(searchBody(projectsOnly.body)).toMatchObject({
      tasks: {
        items: [],
        total: 0,
      },
      projects: {
        total: 3,
      },
    });
    expect(searchBody(projectsOnly.body).projects.items).toHaveLength(2);
    expect(
      itemIds(searchBody(projectsOnly.body).projects.items).every((projectId) =>
        projects.some((item) => item.id === projectId)
      )
    ).toBe(true);
  });

  it('matches percent and underscore characters literally', async () => {
    const account = await createAccount();
    const project = await seedProject(account.id, {
      name: 'Wildcard search fixtures',
    });
    const percentMatch = await seedTask(account.id, project.id, {
      title: 'Literal a% marker',
    });
    await seedTask(account.id, project.id, {
      title: 'Literal alpha marker',
    });
    const underscoreMatch = await seedTask(account.id, project.id, {
      title: 'Literal b_ marker',
    });
    await seedTask(account.id, project.id, {
      title: 'Literal bX marker',
    });

    const percent = await searchRequest(
      { q: 'a%', type: 'tasks' },
      account.token
    );
    expect(percent.status).toBe(200);
    expect(itemIds(searchBody(percent.body).tasks.items)).toEqual([
      percentMatch.id,
    ]);

    const underscore = await searchRequest(
      { q: 'b_', type: 'tasks' },
      account.token
    );
    expect(underscore.status).toBe(200);
    expect(itemIds(searchBody(underscore.body).tasks.items)).toEqual([
      underscoreMatch.id,
    ]);
  });

  it('excludes deleted and archived rows by default and includes archived rows only on request', async () => {
    const account = await createAccount();
    const activeProject = await seedProject(account.id, {
      name: 'active search scope',
    });
    const archivedProject = await seedProject(account.id, {
      name: 'archivecase archived project',
      isArchived: true,
    });
    const deletedProject = await seedProject(account.id, {
      name: 'archivecase deleted project',
      deletedAt: new Date(),
    });
    const activeTask = await seedTask(account.id, activeProject.id, {
      title: 'archivecase active task',
    });
    const archivedTask = await seedTask(account.id, activeProject.id, {
      title: 'archivecase archived task',
      archivedAt: new Date(),
    });
    const taskInArchivedProject = await seedTask(
      account.id,
      archivedProject.id,
      { title: 'archivecase archived project task' }
    );
    const deletedTask = await seedTask(account.id, activeProject.id, {
      title: 'archivecase deleted task',
      deletedAt: new Date(),
    });
    const taskInDeletedProject = await seedTask(account.id, deletedProject.id, {
      title: 'archivecase deleted project task',
    });

    const defaultResponse = await searchRequest(
      { q: 'archivecase' },
      account.token
    );
    expect(defaultResponse.status).toBe(200);
    const defaultResults = searchBody(defaultResponse.body);
    expect(itemIds(defaultResults.tasks.items)).toEqual([activeTask.id]);
    expect(itemIds(defaultResults.projects.items)).toEqual([]);
    expect(defaultResults.tasks.total).toBe(1);
    expect(defaultResults.projects.total).toBe(0);

    const archivedResponse = await searchRequest(
      { q: 'archivecase', includeArchived: 'true' },
      account.token
    );
    expect(archivedResponse.status).toBe(200);
    const archivedResults = searchBody(archivedResponse.body);
    expect(itemIds(archivedResults.tasks.items).sort((a, b) => a - b)).toEqual(
      [activeTask.id, archivedTask.id, taskInArchivedProject.id].sort(
        (a, b) => a - b
      )
    );
    expect(itemIds(archivedResults.projects.items)).toEqual([
      archivedProject.id,
    ]);
    expect(
      archivedResults.tasks.items.find(({ id }) => id === archivedTask.id)
    ).toMatchObject({ isArchived: true });
    expect(
      archivedResults.tasks.items.find(
        ({ id }) => id === taskInArchivedProject.id
      )
    ).toMatchObject({ isArchived: false });
    expect(itemIds(archivedResults.tasks.items)).not.toContain(deletedTask.id);
    expect(itemIds(archivedResults.tasks.items)).not.toContain(
      taskInDeletedProject.id
    );
    expect(itemIds(archivedResults.projects.items)).not.toContain(
      deletedProject.id
    );
  });

  it('returns only the caller’s matching tasks and projects', async () => {
    const account = await createAccount();
    const otherAccount = await createAccount();
    const project = await seedProject(account.id, {
      name: 'tenantneedle own project',
    });
    const otherProject = await seedProject(otherAccount.id, {
      name: 'tenantneedle private project',
    });
    const task = await seedTask(account.id, project.id, {
      title: 'tenantneedle own task',
    });
    const otherTask = await seedTask(otherAccount.id, otherProject.id, {
      title: 'tenantneedle private task',
    });

    const response = await searchRequest({ q: 'tenantneedle' }, account.token);
    expect(response.status).toBe(200);
    const results = searchBody(response.body);
    expect(itemIds(results.tasks.items)).toEqual([task.id]);
    expect(itemIds(results.projects.items)).toEqual([project.id]);
    expect(itemIds(results.tasks.items)).not.toContain(otherTask.id);
    expect(itemIds(results.projects.items)).not.toContain(otherProject.id);
  });

  it('returns empty result groups when there is no match', async () => {
    const account = await createAccount();
    const response = await searchRequest(
      { q: 'no-such-search-term' },
      account.token
    );
    expect(response.status).toBe(200);
    expect(searchBody(response.body)).toEqual({
      tasks: { items: [], total: 0 },
      projects: { items: [], total: 0 },
    });
  });

  it('validates query lengths and requires authentication', async () => {
    const account = await createAccount();
    for (const q of ['x', 'x'.repeat(101)]) {
      const response = await searchRequest({ q }, account.token);
      expect(response.status).toBe(400);
    }

    expect((await searchRequest({ q: 'valid term' })).status).toBe(401);
  });
});
