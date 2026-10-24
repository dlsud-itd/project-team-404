import { cpSync, existsSync, mkdirSync } from 'node:fs';

const src = 'frontend/coverage/frontend';
if (existsSync(src)) {
  mkdirSync('reports/frontend', { recursive: true });
  cpSync(src, 'reports/frontend/coverage', { recursive: true });
}
