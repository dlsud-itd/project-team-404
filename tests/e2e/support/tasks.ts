import { apiBaseUrl } from './auth';
import {
  deleteLabelRows,
  deleteTaskRows,
  labelRowsForUser,
  taskLabelRowsForUser,
  taskRowsForUser,
} from './database';

export const e2eTaskPrefix = 'E2E Task ';
export const e2eLabelPrefix = 'E2E Label ';

export interface ApiTask {
  id: number;
  projectId: number | null;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  scheduledDate: string | null;
  dueDate: string | null;
  deadline: string | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  recurrenceDays?: number[];
  recurrenceEndDate?: string | null;
  isDone: boolean;
  doneAt: string | null;
  labels: { id: number; name: string; color: string | null }[];
}

export interface ApiLabel {
  id: number;
  name: string;
  color: string | null;
}

export async function taskApi<T>(
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<{ status: number; body: T }> {
  return request<T>(`${apiBaseUrl}/api/tasks${path}`, token, method, body);
}

export async function labelApi<T>(
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<{ status: number; body: T }> {
  return request<T>(`${apiBaseUrl}/api/labels${path}`, token, method, body);
}

async function request<T>(
  url: string,
  token: string,
  method: string,
  body?: unknown
): Promise<{ status: number; body: T }> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: (text ? JSON.parse(text) : null) as T,
  };
}

export class CreatedTaskData {
  private readonly taskIds = new Set<number>();
  private readonly labelIds = new Set<number>();

  addTask(id: number): void {
    this.taskIds.add(id);
  }

  addLabel(id: number): void {
    this.labelIds.add(id);
  }

  async removeAll(userId: string): Promise<void> {
    const taskIds = [...this.taskIds];
    const labelIds = [...this.labelIds];
    this.taskIds.clear();
    this.labelIds.clear();
    await deleteTaskRows(userId, taskIds);
    await deleteLabelRows(userId, labelIds);
  }
}

export async function removeLeftoverTaskData(userId: string): Promise<void> {
  const tasks = await taskRowsForUser(userId);
  const taskIds = tasks
    .filter(
      (row) =>
        typeof row['title'] === 'string' &&
        row['title'].startsWith(e2eTaskPrefix)
    )
    .map((row) => row['task_id'])
    .filter((id): id is number => typeof id === 'number');
  await deleteTaskRows(userId, taskIds);

  const labels = await labelRowsForUser(userId);
  const labelIds = labels
    .filter(
      (row) =>
        typeof row['name'] === 'string' &&
        row['name'].startsWith(e2eLabelPrefix)
    )
    .map((row) => row['label_id'])
    .filter((id): id is number => typeof id === 'number');
  await deleteLabelRows(userId, labelIds);
}

export async function seededTaskAndLabelState(userId: string) {
  return {
    tasks: await taskRowsForUser(userId),
    labels: await labelRowsForUser(userId),
    taskLabels: await taskLabelRowsForUser(userId),
  };
}
