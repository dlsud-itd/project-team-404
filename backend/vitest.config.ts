import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
    reporters: ['default', 'html'],
    outputFile: {
      html: '../reports/backend/results/index.html',
    },
    coverage: {
      provider: 'v8',
      reporter: ['html', 'text-summary'],
      reportsDirectory: '../reports/backend/coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/testing/**', 'src/**/*.test.ts', 'src/server.ts'],
    },
  },
});
