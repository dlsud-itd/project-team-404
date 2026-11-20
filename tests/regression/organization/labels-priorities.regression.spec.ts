import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import { apiFor, createTask, type App } from '../tasks/support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('Sprint 5 labels and priorities regression', () => {
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
    if (testSupabase) await deleteIntegrationAccounts(testSupabase);
  });

  it('preserves Sprint 3 priority-by-name and label CRUD behavior with per-user priorities', async () => {
    const owner = await registerAndLoginAs(app);
    const ownerApi = apiFor(app, owner.token);
    const task = await createTask(ownerApi, {
      title: 'Priority migration regression task',
      priority: 'high',
    });

    const setPriority = await ownerApi.put(`/api/tasks/${task.id}/priority`, {
      priority: 'low',
    });
    expect(setPriority.status).toBe(200);
    expect((await ownerApi.get(`/api/tasks/${task.id}`)).body).toMatchObject({
      priority: 'low',
    });

    const labelCreate = await ownerApi.post('/api/labels', {
      name: 'Sprint 3 label CRUD',
      color: '#3478AA',
    });
    expect(labelCreate.status).toBe(201);
    const labelId = (labelCreate.body as { id: number }).id;
    expect((await ownerApi.get('/api/labels')).body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: labelId,
          name: 'Sprint 3 label CRUD',
          color: '#3478AA',
        }),
      ])
    );

    const renamed = await ownerApi.put(`/api/labels/${labelId}`, {
      name: 'Sprint 3 label renamed',
      color: '#654321',
    });
    expect(renamed.status).toBe(200);
    expect(
      (
        await ownerApi.post(`/api/tasks/${task.id}/labels`, {
          labelIds: [labelId],
        })
      ).status
    ).toBe(200);
    expect((await ownerApi.get(`/api/tasks/${task.id}`)).body).toMatchObject({
      priority: 'low',
      labels: [
        {
          id: labelId,
          name: 'Sprint 3 label renamed',
          color: '#654321',
        },
      ],
    });

    const newUser = await registerAndLoginAs(app);
    const newUserApi = apiFor(app, newUser.token);
    const priorities = await newUserApi.get('/api/priorities');
    expect(priorities.status).toBe(200);
    expect(
      (priorities.body as { name: string }[])
        .map(({ name }) => name.toLowerCase())
        .sort()
    ).toEqual(['high', 'low', 'medium']);

    const persistedTask = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
      include: { priorityLevel: true },
    });
    expect(persistedTask.priorityLevel.name).toBe('Low');

    const deleted = await ownerApi.delete(`/api/labels/${labelId}`);
    expect(deleted.status).toBe(204);
    expect((await ownerApi.get(`/api/tasks/${task.id}`)).body).toMatchObject({
      priority: 'low',
      labels: [],
    });
  });
});
