import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import {
  apiFor,
  createProject,
  createTask,
  type ApiTask,
  type App,
} from '../tasks/support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

integrationDescribe('Sprint 5 sorting and filtering regression', () => {
  let app: App;

  beforeAll(async () => {
    ({ app } = await import('../../../backend/src/app'));
  });

  afterEach(async () => {
    if (testSupabase) await deleteIntegrationAccounts(testSupabase);
  });

  it('preserves Sprint 3 single priority and labelId filters and default task order', async () => {
    const account = await registerAndLoginAs(app);
    const api = apiFor(app, account.token);
    const projectId = await createProject(api, 'Sprint 5 filter compatibility');
    const first = await createTask(api, {
      projectId,
      title: 'Z created first',
      priority: 'low',
    });
    const second = await createTask(api, {
      projectId,
      title: 'A created second',
      priority: 'high',
    });
    const third = await createTask(api, {
      projectId,
      title: 'M created third',
      priority: 'medium',
    });
    const labelResponse = await api.post('/api/labels', {
      name: 'Sprint 3 label filter',
    });
    expect(labelResponse.status).toBe(201);
    const labelId = (labelResponse.body as { id: number }).id;
    expect(
      (
        await api.post(`/api/tasks/${second.id}/labels`, {
          labelIds: [labelId],
        })
      ).status
    ).toBe(200);

    const defaultList = await api.get(`/api/tasks?projectId=${projectId}`);
    const priorityList = await api.get(
      `/api/tasks?projectId=${projectId}&priority=high`
    );
    const labelList = await api.get(`/api/tasks?labelId=${labelId}`);

    expect(defaultList.status).toBe(200);
    expect((defaultList.body as ApiTask[]).map(({ id }) => id)).toEqual([
      first.id,
      second.id,
      third.id,
    ]);
    expect(priorityList.status).toBe(200);
    expect((priorityList.body as ApiTask[]).map(({ id }) => id)).toEqual([
      second.id,
    ]);
    expect(labelList.status).toBe(200);
    expect((labelList.body as ApiTask[]).map(({ id }) => id)).toEqual([
      second.id,
    ]);
  });
});
