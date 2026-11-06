import { randomUUID } from 'node:crypto';
import { expect, type Locator, type Page } from '@playwright/test';
import {
  deleteLeftoverE2EProjects,
  deleteProjectRows,
  profileForUser,
  projectRowsForUser,
  type ProjectRow,
} from './database';
import { baseUrl } from './auth';
import { seedAccounts } from './seed-data';

export const apiBaseUrl = 'http://localhost:3000';
export const e2eProjectPrefix = 'E2E ';

type SeedAccount = (typeof seedAccounts)[number];

export type ApiProject = {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  isInbox: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  sortOrder: number;
};

/** A short id that keeps project names unique between runs, e.g. "lq2x9a-3f1c". */
export function runId(): string {
  return `${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`;
}

/** Logs in through the API (not the browser) and returns a bearer token. */
export async function apiToken(account: SeedAccount): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: account.email,
      password: account.password,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `API login for ${account.username} failed (${response.status})`
    );
  }
  const { token } = (await response.json()) as { token: string };
  return token;
}

export async function projectApi<T = unknown>(
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<{ status: number; body: T }> {
  const response = await fetch(`${apiBaseUrl}/api/projects${path}`, {
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

export async function createProjectThroughApi(
  token: string,
  details: { name: string; description?: string | null; color?: string | null }
): Promise<ApiProject> {
  const { status, body } = await projectApi<ApiProject>(
    token,
    'POST',
    '',
    details
  );
  if (status !== 201)
    throw new Error(`Could not create "${details.name}" (${status})`);
  return body;
}

/** The seeded (non-E2E, non-deleted) projects' organization state, used to restore it. */
export type SeedProjectState = Pick<
  ProjectRow,
  | 'project_id'
  | 'name'
  | 'description'
  | 'color'
  | 'is_inbox'
  | 'is_favorite'
  | 'is_archived'
  | 'sort_order'
  | 'deleted_at'
>;

export async function seededProjects(
  userId: string
): Promise<SeedProjectState[]> {
  return (await projectRowsForUser(userId))
    .filter(
      (row) => row.deleted_at === null && !row.name.startsWith(e2eProjectPrefix)
    )
    .map(
      ({
        project_id,
        name,
        description,
        color,
        is_inbox,
        is_favorite,
        is_archived,
        sort_order,
        deleted_at,
      }) => ({
        project_id,
        name,
        description,
        color,
        is_inbox,
        is_favorite,
        is_archived,
        sort_order,
        deleted_at,
      })
    );
}

/** Puts favorite, archive and sort order back through the API, as the seed had them. */
export async function restoreSeededProjects(
  token: string,
  snapshot: SeedProjectState[]
): Promise<void> {
  for (const project of snapshot) {
    if (project.is_inbox) continue;
    const path = `/${project.project_id}`;
    for (const [route, body] of [
      ['/favorite', { isFavorite: project.is_favorite }],
      ['/archive', { isArchived: project.is_archived }],
      ['/sort-order', { sortOrder: project.sort_order }],
    ] as const) {
      const { status } = await projectApi(
        token,
        'PUT',
        `${path}${route}`,
        body
      );
      if (status !== 200) {
        throw new Error(
          `Could not restore ${project.name}${route} (${status})`
        );
      }
    }
  }
}

/** Tracks projects a test creates so afterEach can remove them, whoever owns them. */
export class CreatedProjects {
  private readonly ids = new Set<number>();

  add(projectId: number): void {
    this.ids.add(projectId);
  }

  async removeAll(): Promise<void> {
    const ids = [...this.ids];
    this.ids.clear();
    await deleteProjectRows(ids);
  }
}

export async function userIdFor(account: SeedAccount): Promise<string> {
  return (await profileForUser(account.email)).user_id;
}

export async function removeLeftovers(
  ...accounts: SeedAccount[]
): Promise<void> {
  for (const account of accounts) {
    await deleteLeftoverE2EProjects(await userIdFor(account), e2eProjectPrefix);
  }
}

export async function openProjectList(page: Page): Promise<Locator> {
  await page.goto(`${baseUrl}/home?tab=projects`);
  const list = page.locator('app-projects-page');
  await expect(list.locator('app-project-card.inbox')).toBeVisible();
  return list;
}

export async function openOrganizer(page: Page): Promise<Locator> {
  await page.goto(`${baseUrl}/home?tab=projects&view=organize`);
  const switcher = page.locator('app-project-switcher');
  await expect(switcher.locator('.item.inbox')).toBeVisible();
  return switcher;
}

/** The project card on the list page whose title link is exactly `name`. */
export function projectCard(list: Locator, name: string): Locator {
  return list.locator('app-project-card').filter({
    has: list.page().getByRole('link', { name, exact: true }),
  });
}

/** Hex (#RRGGBB) to the rgb() string the browser reports for a computed color. */
export function rgb(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}
