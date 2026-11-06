import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  configureSupabaseTest,
  deleteIntegrationAccounts,
  registerAndLoginAs,
} from '../../../backend/tests/integration/helpers/supabase-test-support';
import {
  TASK_KEYS,
  apiFor,
  createProject,
  createTask,
  projectTasks,
  type App,
  type ApiTask,
} from './support';

const testSupabase = configureSupabaseTest();
const integrationDescribe = testSupabase ? describe : describe.skip;

// Friday 20 November 2026, with a deadline at the end of that day in Manila (UTC+8).
const DUE = '2026-11-20';
const DEADLINE = '2026-11-20T15:59:59.999Z';

integrationDescribe('Task Scheduling API regression', () => {
  let app: App;

  beforeAll(async () => {
    ({ app } = await import('../../../backend/src/app'));
  });

  afterEach(async () => {
    if (testSupabase) await deleteIntegrationAccounts(testSupabase);
  });

  it('completes a recurring task and creates exactly one next occurrence', async () => {
    const owner = await registerAndLoginAs(app);
    const api = apiFor(app, owner.token);
    const projectId = await createProject(api, 'Gym');
    const task = await createTask(api, {
      projectId,
      title: 'Leg day',
      dueDate: DUE,
      deadline: DEADLINE,
      recurrence: 'weekly',
      recurrenceDays: [5],
      recurrenceEndDate: '2026-12-31',
    });
    expect(task).toMatchObject({
      dueDate: DUE,
      deadline: DEADLINE,
      recurrence: 'weekly',
      recurrenceDays: [5],
      recurrenceEndDate: '2026-12-31',
    });

    const done = await api.put(`/api/tasks/${task.id}`, {
      isDone: true,
      doneAt: '2026-11-20T10:00:00.000Z',
    });
    expect(done.status).toBe(200);

    // Completing the same task again must not create a second next occurrence.
    expect(
      (await api.put(`/api/tasks/${task.id}`, { isDone: true })).status
    ).toBe(200);

    const tasks = await projectTasks(api, projectId);
    expect(tasks).toHaveLength(2);
    const original = tasks.find((t) => t.id === task.id)!;
    const next = tasks.find((t) => t.id !== task.id)!;
    expect(original).toMatchObject({
      isDone: true,
      doneAt: '2026-11-20T10:00:00.000Z',
    });
    expect(next).toMatchObject({
      title: 'Leg day',
      projectId,
      isDone: false,
      doneAt: null,
      dueDate: '2026-11-27',
      // The deadline keeps its distance from the due date.
      deadline: '2026-11-27T15:59:59.999Z',
      recurrence: 'weekly',
      recurrenceDays: [5],
      recurrenceEndDate: '2026-12-31',
    });
  });

  it('does not create a next occurrence after the repeat ends, or for a one-off task', async () => {
    const owner = await registerAndLoginAs(app);
    const api = apiFor(app, owner.token);
    const projectId = await createProject(api, 'Endings');
    const lastDay = await createTask(api, {
      projectId,
      title: 'Last day',
      dueDate: '2026-12-31',
      recurrence: 'daily',
      recurrenceEndDate: '2026-12-31',
    });
    const oneOff = await createTask(api, {
      projectId,
      title: 'One-off',
      dueDate: DUE,
    });

    for (const task of [lastDay, oneOff]) {
      expect(
        (await api.put(`/api/tasks/${task.id}`, { isDone: true })).status
      ).toBe(200);
    }

    const tasks = await projectTasks(api, projectId);
    expect(tasks.map((t) => t.id).sort((a, b) => a - b)).toEqual([
      lastDay.id,
      oneOff.id,
    ]);
    expect(tasks.every((t) => t.isDone)).toBe(true);
  });

  it('keeps Task CRUD responses whole when the scheduling columns are set and cleared', async () => {
    const owner = await registerAndLoginAs(app);
    const api = apiFor(app, owner.token);
    const projectId = await createProject(api, 'Schedule');
    const task = await createTask(api, {
      projectId,
      title: 'Essay',
      priority: 'medium',
    });

    const steps: [string, Record<string, unknown>, Partial<ApiTask>][] = [
      ['due-date', { dueDate: DUE }, { dueDate: DUE }],
      ['deadline', { deadline: DEADLINE }, { deadline: DEADLINE }],
      [
        'recurrence',
        {
          recurrence: 'weekly',
          recurrenceDays: [1, 5],
          recurrenceEndDate: '2026-12-31',
        },
        {
          recurrence: 'weekly',
          recurrenceDays: [1, 5],
          recurrenceEndDate: '2026-12-31',
        },
      ],
      [
        'recurrence',
        { recurrence: 'none', recurrenceDays: [], recurrenceEndDate: null },
        { recurrence: 'none', recurrenceDays: [], recurrenceEndDate: null },
      ],
      ['deadline', { deadline: null }, { deadline: null }],
      ['due-date', { dueDate: null }, { dueDate: null }],
    ];
    for (const [route, body, expected] of steps) {
      const response = await api.put(`/api/tasks/${task.id}/${route}`, body);
      expect(response.status, `${route} ${JSON.stringify(body)}`).toBe(200);
      // Scheduling routes return the whole task, as Task CRUD does.
      expect(Object.keys(response.body as object).sort()).toEqual(TASK_KEYS);
      expect(response.body).toMatchObject({
        ...expected,
        title: 'Essay',
        priority: 'medium',
      });

      const fetched = await api.get(`/api/tasks/${task.id}`);
      expect(Object.keys(fetched.body as object).sort()).toEqual(TASK_KEYS);
      expect(fetched.body).toMatchObject(expected);
    }

    // The list carries the same fields.
    const [listed] = await projectTasks(api, projectId);
    expect(Object.keys(listed).sort()).toEqual(TASK_KEYS);
  });

  it('rejects invalid schedule values and leaves the task unchanged', async () => {
    const owner = await registerAndLoginAs(app);
    const api = apiFor(app, owner.token);
    const projectId = await createProject(api, 'Invalid');
    const task = await createTask(api, {
      projectId,
      title: 'Stable',
      dueDate: DUE,
    });

    for (const [route, body] of [
      ['due-date', { dueDate: '20/11/2026' }],
      ['deadline', { deadline: 'tomorrow' }],
      ['recurrence', { recurrence: 'hourly' }],
      ['recurrence', { recurrence: 'daily', recurrenceDays: [1] }],
      ['recurrence', { recurrence: 'weekly', recurrenceDays: [7] }],
    ] as const) {
      const response = await api.put(`/api/tasks/${task.id}/${route}`, body);
      expect(response.status, `${route} ${JSON.stringify(body)}`).toBe(400);
    }
    expect(
      (
        await api.post('/api/tasks', {
          projectId,
          title: 'Bad end',
          dueDate: DUE,
          recurrence: 'weekly',
          recurrenceDays: [5],
          recurrenceEndDate: '2026-11-19',
        })
      ).status
    ).toBe(400);

    // Nothing changed, not even updatedAt.
    expect((await api.get(`/api/tasks/${task.id}`)).body).toEqual(task);
  });
});
