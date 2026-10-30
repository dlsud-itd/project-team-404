import { Router } from 'express';
import type { SessionService } from '../auth/session/session.service';
import { createLabelCrudRouter } from './label-crud/label-crud.routes';

export function createLabelsRouter(sessionService: SessionService): Router {
  return createLabelCrudRouter(sessionService);
}
