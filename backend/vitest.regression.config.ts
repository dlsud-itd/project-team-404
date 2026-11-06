import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '..',
  test: {
    environment: 'node',
    include: [
      'tests/regression/projects/**/*.spec.ts',
      'tests/regression/tasks/**/*.spec.ts',
    ],
    testTimeout: 180_000,
    reporters: ['default'],
  },
});
