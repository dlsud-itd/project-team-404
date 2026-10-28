import express, { type Express } from 'express';

export type TestAppOptions = {
  beforeSetup?: (app: Express) => void;
  afterSetup?: (app: Express) => void;
};

export function createTestApp(options: TestAppOptions = {}): Express {
  const app = express();

  app.use(express.json());

  if (options.beforeSetup) {
    options.beforeSetup(app);
  }

  if (options.afterSetup) {
    options.afterSetup(app);
  }

  return app;
}
