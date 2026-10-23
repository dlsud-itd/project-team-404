import type { RequestHandler } from 'express';
import type { ProjectRecord } from '../models/project.model';

type FindOwnedProject = (
  projectId: number,
  userId: string
) => Promise<ProjectRecord | null>;

export function ownedProjectMiddleware(
  findProject: FindOwnedProject
): RequestHandler {
  return async (req, res, next) => {
    try {
      const projectId = res.locals.validated as number;
      const project = await findProject(projectId, req.auth!.userId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.locals.ownedProject = project;
      next();
    } catch (error) {
      next(error);
    }
  };
}
