import { expect } from 'vitest';
import { request } from '../../../backend/tests/integration/helpers/request';

export type App = (typeof import('../../../backend/src/app'))['app'];

/** A task as toTaskModel in backend/src/features/tasks/shared/models/task.model.ts sends it. */
export type ApiTask = {
  id: number;
  projectId: number | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  scheduledDate: string | null;
  dueDate: string | null;
  deadline: string | null;
  recurrence: string | null;
  recurrenceDays: number[];
  recurrenceEndDate: string | null;
  isDone: boolean;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
  labels: { id: number; name: string; color: string | null }[];
};

/** Every field of a task response, so a change to the shape is caught. */
export const TASK_KEYS = [
  'createdAt',
  'deadline',
  'description',
  'doneAt',
  'dueDate',
  'id',
  'isDone',
  'labels',
  'priority',
  'projectId',
  'recurrence',
  'recurrenceDays',
  'recurrenceEndDate',
  'scheduledDate',
  'title',
  'updatedAt',
];

/** Sends authenticated requests for one account. */
export function apiFor(app: App, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  return {
    get: (path: string) => request(app, path, { headers }),
    post: (path: string, body?: unknown) =>
      request(app, path, { method: 'POST', headers, body }),
    put: (path: string, body?: unknown) =>
      request(app, path, { method: 'PUT', headers, body }),
    patch: (path: string, body?: unknown) =>
      request(app, path, { method: 'PATCH', headers, body }),
    delete: (path: string) => request(app, path, { method: 'DELETE', headers }),
  };
}

export type Api = ReturnType<typeof apiFor>;

export async function createProject(api: Api, name: string): Promise<number> {
  const response = await api.post('/api/projects', { name });
  expect(response.status, `create project ${name}`).toBe(201);
  return (response.body as { id: number }).id;
}

export async function createTask(
  api: Api,
  body: Record<string, unknown>
): Promise<ApiTask> {
  const response = await api.post('/api/tasks', body);
  expect(response.status, `create task ${String(body['title'])}`).toBe(201);
  return response.body as ApiTask;
}

/** Every task of a project, open and completed. */
export async function projectTasks(
  api: Api,
  projectId: number
): Promise<ApiTask[]> {
  const response = await api.get(
    `/api/tasks?projectId=${projectId}&status=all&pageSize=100`
  );
  expect(response.status).toBe(200);
  return response.body as ApiTask[];
}
