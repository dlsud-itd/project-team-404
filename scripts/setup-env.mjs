import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFiles = [
  ['frontend/.env.example', 'frontend/.env'],
  ['backend/.env.example', 'backend/.env'],
];

for (const [example, target] of envFiles) {
  const examplePath = resolve(example);
  const targetPath = resolve(target);

  if (!existsSync(examplePath)) {
    throw new Error(`Environment template not found: ${example}`);
  }

  if (existsSync(targetPath)) {
    console.log(`Kept existing ${target}`);
    continue;
  }

  copyFileSync(examplePath, targetPath);
  console.log(`Created ${target}`);
}
