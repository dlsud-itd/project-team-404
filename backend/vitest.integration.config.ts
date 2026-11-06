import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.{test,spec}.ts'],
    testTimeout: 60_000,
    reporters: ['default', 'html'],
    outputFile: {
      html: '../reports/backend/results/index.html',
    },
  },
});
