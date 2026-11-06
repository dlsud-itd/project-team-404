// Runs every regression suite in order and prints a pass-count summary for the regression log.
// A step only passes when its command succeeds with no failed and no skipped tests.
import { execSync, spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const rootScripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
const backendEnv = {
  NODE_ENV: 'test',
  CORS_ALLOWED_ORIGINS: 'http://localhost:4200',
  ...localTestEnv(),
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
    name: 'Project + Task API regression (tests/regression)',
    command: 'npm --prefix backend run test:regression:projects',
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
    name: 'E2E (tests/e2e)',
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

/** Supplies local Supabase credentials only; never reads a remote test target from .env. */
function localTestEnv() {
  const cli = 'node_modules/supabase/dist/supabase.js';
  const env = {
    ...process.env,
    SUPABASE_DISABLE_UPDATE_CHECK: '1',
  };
  const started = spawnSync(process.execPath, [cli, 'start'], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (started.error || started.status !== 0) {
    throw new Error(
      'Could not start local Supabase for regression tests. Ensure Docker is running.'
    );
  }

  const status = spawnSync(process.execPath, [cli, 'status', '-o', 'env'], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (status.error || status.status !== 0) {
    throw new Error(
      'Could not read the local Supabase status for regression tests.'
    );
  }

  const values = new Map();
  for (const line of status.stdout.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Z_]+)=(?:"([^"]*)"|'([^']*)'|(.*))$/);
    if (match) values.set(match[1], match[2] ?? match[3] ?? match[4] ?? '');
  }

  const apiUrl = values.get('API_URL');
  const databaseUrl = values.get('DB_URL');
  const serviceRoleKey = values.get('SERVICE_ROLE_KEY');
  if (!apiUrl || !databaseUrl || !serviceRoleKey) {
    throw new Error(
      'Local Supabase did not provide API_URL, DB_URL, and SERVICE_ROLE_KEY.'
    );
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  for (const [name, value] of [
    ['API_URL', apiUrl],
    ['DB_URL', databaseUrl],
  ]) {
    if (!localHosts.has(new URL(value).hostname.replace(/^\[|\]$/g, ''))) {
      throw new Error(`Refusing regression tests: ${name} is not local.`);
    }
  }

  return {
    SUPABASE_TEST_URL: apiUrl,
    SUPABASE_TEST_SERVICE_ROLE_KEY: serviceRoleKey,
    SUPABASE_TEST_DATABASE_URL: databaseUrl,
    SUPABASE_TEST_DIRECT_URL: databaseUrl,
    // Prisma's config needs these even to generate the client (the backend's pretest step), and
    // backend/.env may not set them. Like CI, point them at the local database; the test helper
    // replaces them with the SUPABASE_TEST_* values before connecting.
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
  };
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
