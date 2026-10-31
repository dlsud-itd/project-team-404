// Runs every regression suite in order and prints a pass-count summary for the regression log.
// A step only passes when its command succeeds with no failed and no skipped tests.
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const TEST_ENV_KEYS = [
  'SUPABASE_TEST_URL',
  'SUPABASE_TEST_SERVICE_ROLE_KEY',
  'SUPABASE_TEST_DATABASE_URL',
  'SUPABASE_TEST_DIRECT_URL',
  'TEST_DATABASE_URL',
  'TEST_DIRECT_URL',
];

const rootScripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
const backendEnv = {
  NODE_ENV: 'test',
  CORS_ALLOWED_ORIGINS: 'http://localhost:4200',
  ...testEnv(),
};

const steps = [
  {
    name: 'Backend unit',
    command: 'npm --prefix backend test',
    env: backendEnv,
  },
  {
    name: 'Backend integration',
    command: 'npm --prefix backend run test:integration',
    env: backendEnv,
    missing: backendEnv.SUPABASE_TEST_URL
      ? null
      : 'SUPABASE_TEST_* is not set, so the suite would only skip',
  },
  {
    name: 'Frontend unit + integration',
    command: 'npm --prefix frontend run test:run',
  },
  {
    name: 'E2E',
    command: 'npm run test:e2e',
    missing: rootScripts['test:e2e']
      ? null
      : 'no root test:e2e script exists yet',
  },
  {
    name: 'Frontend regression',
    command: 'npm --prefix frontend run test:regression',
  },
];

const results = [];
for (const step of steps) {
  console.log(`\n=== ${step.name}: ${step.command}`);
  if (step.missing) {
    console.log(`Not run: ${step.missing}.`);
    results.push({ ...step, status: 'NOT RUN', note: step.missing });
    continue;
  }
  const { code, output } = await run(step.command, step.env);
  const counts = vitestCounts(output);
  const problems = [];
  if (code !== 0) problems.push(`exit code ${code}`);
  if (counts?.failed) problems.push(`${counts.failed} failed`);
  if (counts?.skipped) problems.push(`${counts.skipped} skipped`);
  results.push({
    ...step,
    counts,
    status: problems.length ? 'FAIL' : 'PASS',
    note: problems.join(', '),
  });
}

const summary = [
  `Regression run: ${new Date().toISOString()} on ${gitSha()}`,
  '',
  '| Suite | Command | Status | Passed | Failed | Skipped | Notes |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...results.map(
    ({ name, command, status, counts, note }) =>
      `| ${name} | \`${command}\` | ${status} | ${counts?.passed ?? '-'} | ${counts?.failed ?? '-'} | ${counts?.skipped ?? '-'} | ${note || ''} |`
  ),
].join('\n');

console.log(`\n${summary}\n`);
mkdirSync('reports/regression', { recursive: true });
writeFileSync('reports/regression/summary.md', `${summary}\n`);
console.log('Summary saved to reports/regression/summary.md');
process.exit(results.every((r) => r.status === 'PASS') ? 0 : 1);

/** The Supabase test-project values from the environment or backend/.env, and nothing else. */
function testEnv() {
  const fromFile = {};
  if (existsSync('backend/.env')) {
    for (const line of readFileSync('backend/.env', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (match && TEST_ENV_KEYS.includes(match[1]) && match[2]) {
        fromFile[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
      }
    }
  }
  const values = Object.fromEntries(
    TEST_ENV_KEYS.map((key) => [key, process.env[key] || fromFile[key]]).filter(
      ([, v]) => v
    )
  );
  values.SUPABASE_TEST_DATABASE_URL ??= values.TEST_DATABASE_URL;
  values.SUPABASE_TEST_DIRECT_URL ??= values.TEST_DIRECT_URL;
  return values;
}

function run(command, env = {}) {
  return new Promise((resolve) => {
    let output = '';
    const child = spawn(command, {
      shell: true,
      env: { ...process.env, ...env },
    });
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => {
        process.stdout.write(chunk);
        output += chunk;
      });
    }
    child.on('close', (code) => resolve({ code, output }));
  });
}

/** Reads Vitest's "Tests  12 passed | 1 skipped (13)" line. */
function vitestCounts(output) {
  // eslint-disable-next-line no-control-regex
  const line = output
    .replace(/\x1b\[[0-9;]*m/g, '')
    .match(/^\s*Tests\s+(.+\(\d+\))\s*$/m)?.[1];
  if (!line) return null;
  const count = (label) =>
    Number(line.match(new RegExp(`(\\d+) ${label}`))?.[1] ?? 0);
  return {
    passed: count('passed'),
    failed: count('failed'),
    skipped: count('skipped'),
  };
}

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown commit';
  }
}
