import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { SessionService } from '../../auth/session/session.service';
import type { ProjectRecord } from '../shared/models/project.model';
import { request } from '../../../testing/helpers';
import { createProjectOrganizationRouter } from './project-organization.routes';

const project: ProjectRecord = {
  id: 7,
  userId: 'user-123',
  name: 'Planning',
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
  createdAt: new Date('2026-10-20T00:00:00.000Z'),
  updatedAt: new Date('2026-10-20T00:00:00.000Z'),
  deletedAt: null,
};

function makeApp() {
  const sessionService = {
    verify: vi
      .fn()
      .mockResolvedValue({ userId: 'user-123', expiresAt: new Date() }),
  } as unknown as SessionService;
  const dependencies = {
    setProjectFavorite: vi.fn().mockResolvedValue({ count: 1 }),
    setProjectArchived: vi.fn().mockResolvedValue({ count: 1 }),
    setProjectSortOrder: vi.fn().mockResolvedValue({ count: 1 }),
    updateProjectSortOrders: vi.fn().mockResolvedValue([]),
  };
  const findProject = vi.fn().mockResolvedValue(project);

  const app = express();
  app.use(express.json());
  app.use(
    '/api/projects',
    createProjectOrganizationRouter(sessionService, dependencies, findProject)
  );
  return { app, dependencies, findProject };
}

const auth = { Authorization: 'Bearer token' };

describe('project organization routes', () => {
  it.each([
    ['favorite', { isFavorite: true }],
    ['archive', { isArchived: true }],
    ['sort-order', { sortOrder: 2 }],
  ])(
    'looks up the project by its URL id, not the body, for PUT /:projectId/%s',
    async (route, body) => {
      const { app, findProject } = makeApp();

      const response = await request(app, `/api/projects/7/${route}`, {
        method: 'PUT',
        headers: auth,
        body,
      });

      expect(response.status).toBe(200);
      expect(findProject).toHaveBeenCalledWith(7, 'user-123');
    }
  );

  it('passes the validated body to the service', async () => {
    const { app, dependencies } = makeApp();

    await request(app, '/api/projects/7/favorite', {
      method: 'PUT',
      headers: auth,
      body: { isFavorite: true },
    });

    expect(dependencies.setProjectFavorite).toHaveBeenCalledWith(
      7,
      'user-123',
      true
    );
  });

  it('still rejects an invalid body with 400', async () => {
    const { app } = makeApp();

    const response = await request(app, '/api/projects/7/favorite', {
      method: 'PUT',
      headers: auth,
      body: { isFavorite: 'yes' },
    });

    expect(response.status).toBe(400);
  });
});
