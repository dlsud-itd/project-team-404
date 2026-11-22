import type { FullConfig } from '@playwright/test';
import {
  deleteCreatedUsers,
  initializeSeedState,
  restoreAllSeedAccounts,
} from './database';

export default async function globalSetup(_config: FullConfig) {
  if (!process.env['E2E_STATE_FILE']) {
    throw new Error(
      'Run E2E tests through npm run test:e2e so local safety checks are applied'
    );
  }
  await initializeSeedState();

  return async () => {
    try {
      await deleteCreatedUsers();
    } finally {
      await restoreAllSeedAccounts();
    }
  };
}
