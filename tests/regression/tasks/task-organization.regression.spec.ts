import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  loginAs,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import {
  apiFor,
  createProject,
  createTask,
  type Api,
  type App,
  type ApiTask,
} from './support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

type ApiLabel = { id: number; name: string; color: string | null };

async function createLabel(
  api: Api,
  name: string,
  color: string | null = null
) {
  const response = await api.post('/api/labels', { name, color });
  expect(response.status, `create label ${name}`).toBe(201);
  return response.body as ApiLabel;
}

/** Ids of the caller's tasks matching a query string, in the order returned. */
async function idsFor(api: Api, query: string): Promise<number[]> {
  const response = await api.get(`/api/tasks?status=all&pageSize=100&${query}`);
  expect(response.status, query).toBe(200);
  return (response.body as ApiTask[]).map((t) => t.id);
}

integrationDescribe('Task Organization API regression', () => {
  let app: App;

  beforeAll(async () => {
    ({ app } = await import('../../../backend/src/app'));
  });

  afterEach(async () => {
    if (testSupabase) await deleteIntegrationAccounts(testSupabase);
  });

  it('sets priority, attaches and detaches labels, and filters and orders by them', async () => {
    const owner = await registerAndLoginAs(app);
    const api = apiFor(app, owner.token);
    const projectId = await createProject(api, 'Organized');
    const urgent = await createTask(api, {
      projectId,
      title: 'B urgent',
      priority: 'high',
    });
    const later = await createTask(api, {
      projectId,
      title: 'A later',
      priority: 'low',
    });

    // Priority
    const priority = await api.put(`/api/tasks/${later.id}/priority`, {
      priority: 'medium',
    });
    expect(priority.status).toBe(200);
    expect((await api.get(`/api/tasks/${later.id}`)).body).toMatchObject({
      priority: 'medium',
    });
    const beforeInvalid = (await api.get(`/api/tasks/${later.id}`)).body;
    expect(
      (await api.put(`/api/tasks/${later.id}/priority`, { priority: 'urgent' }))
        .status
    ).toBe(400);
    expect((await api.get(`/api/tasks/${later.id}`)).body).toEqual(
      beforeInvalid
    );

    // Labels
    const school = await createLabel(api, 'School', '#2563EB');
    expect(school).toMatchObject({ name: 'School', color: '#2563EB' });
    const duplicate = await api.post('/api/labels', { name: 'School' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ code: 'label-name-taken' });

    // A repeated id is attached once.
    const attached = await api.post(`/api/tasks/${urgent.id}/labels`, {
      labelIds: [school.id, school.id],
    });
    expect(attached.status).toBe(200);
    expect(attached.body).toMatchObject({
      labels: [{ id: school.id, name: 'School' }],
    });
    expect((await api.get(`/api/tasks/${urgent.id}`)).body).toMatchObject({
      labels: [{ id: school.id, name: 'School', color: '#2563EB' }],
    });
    expect(
      (await api.post(`/api/tasks/${urgent.id}/labels`, { labelIds: [] }))
        .status
    ).toBe(400);

    // Filters and ordering
    expect(await idsFor(api, `projectId=${projectId}&priority=high`)).toEqual([
      urgent.id,
    ]);
    expect(await idsFor(api, `projectId=${projectId}&priority=medium`)).toEqual(
      [later.id]
    );
    expect(await idsFor(api, `labelId=${school.id}`)).toEqual([urgent.id]);
    expect(await idsFor(api, `projectId=${projectId}&orderBy=title`)).toEqual([
      later.id,
      urgent.id,
    ]);
    expect((await api.get('/api/tasks?priority=urgent')).status).toBe(400);
    expect((await api.get('/api/tasks?orderBy=colour')).status).toBe(400);

    // Detach
    const detached = await api.delete(
      `/api/tasks/${urgent.id}/labels/${school.id}`
    );
    expect(detached.status).toBe(200);
    expect(detached.body).toEqual({ labels: [] });
    expect(await idsFor(api, `labelId=${school.id}`)).toEqual([]);

    // Deleting a label removes it from its tasks.
    await api.post(`/api/tasks/${urgent.id}/labels`, { labelIds: [school.id] });
    expect((await api.delete(`/api/labels/${school.id}`)).status).toBe(204);
    expect((await api.get(`/api/tasks/${urgent.id}`)).body).toMatchObject({
      labels: [],
    });
  });

  it("keeps each user's labels, priorities and filters to themselves", async () => {
    const owner = await registerAndLoginAs(app);
    const other = await loginAs(app, testSupabase!);
    const api = apiFor(app, owner.token);
    const otherApi = apiFor(app, other.token);
    const projectId = await createProject(api, 'Owner only');
    const task = await createTask(api, {
      projectId,
      title: 'Owner task',
      priority: 'low',
    });
    const label = await createLabel(api, 'Private');
    await api.post(`/api/tasks/${task.id}/labels`, { labelIds: [label.id] });
    const otherTask = await createTask(otherApi, { title: 'Other task' });

    // Another user cannot see or change the owner's labels or tasks.
    expect(
      ((await otherApi.get('/api/labels')).body as ApiLabel[]).map((l) => l.id)
    ).not.toContain(label.id);
    expect((await otherApi.get(`/api/labels/${label.id}`)).status).toBe(404);
    expect(
      (await otherApi.put(`/api/labels/${label.id}`, { name: 'Taken' })).status
    ).toBe(404);
    expect((await otherApi.delete(`/api/labels/${label.id}`)).status).toBe(404);
    expect(
      (
        await otherApi.put(`/api/tasks/${task.id}/priority`, {
          priority: 'high',
        })
      ).status
    ).toBe(404);
    expect((await otherApi.get(`/api/tasks/${task.id}/labels`)).status).toBe(
      404
    );
    expect(
      (
        await otherApi.post(`/api/tasks/${task.id}/labels`, {
          labelIds: [label.id],
        })
      ).status
    ).toBe(404);
    expect(
      (await otherApi.delete(`/api/tasks/${task.id}/labels/${label.id}`)).status
    ).toBe(404);

    // Nor attach the owner's label to their own task, or filter by it.
    expect(
      (
        await otherApi.post(`/api/tasks/${otherTask.id}/labels`, {
          labelIds: [label.id],
        })
      ).status
    ).toBe(404);
    expect(await idsFor(otherApi, `labelId=${label.id}`)).toEqual([]);
    expect(await idsFor(otherApi, 'priority=low')).not.toContain(task.id);

    // A mix of an own label and a foreign one is rejected whole: nothing is attached.
    const ownLabel = await createLabel(otherApi, 'Mine');
    expect(
      (
        await otherApi.post(`/api/tasks/${otherTask.id}/labels`, {
          labelIds: [ownLabel.id, label.id],
        })
      ).status
    ).toBe(404);
    expect(
      (await otherApi.get(`/api/tasks/${otherTask.id}`)).body
    ).toMatchObject({ labels: [] });

    // Label names are unique per user, not across users.
    expect(
      (await otherApi.post('/api/labels', { name: 'Private' })).status
    ).toBe(201);

    // The owner's data is unchanged.
    expect((await api.get(`/api/tasks/${task.id}`)).body).toMatchObject({
      priority: 'low',
      labels: [{ id: label.id, name: 'Private' }],
    });
  });
});
