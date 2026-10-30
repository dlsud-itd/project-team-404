import { spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  mkdtempSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = join(root, 'frontend');
const backend = join(root, 'backend');
const tempDir = mkdtempSync(join(tmpdir(), 'habittracker-e2e-'));
const backendLog = join(tempDir, 'backend.log');
const stateFile = join(tempDir, 'state.json');
const testResultsDir = join(root, 'tests', 'e2e', 'test-results');
const backendEnvironment = readBackendEnvironment();
const generatedEnvironment = join(
  frontend,
  'src',
  'environments',
  'environment.generated.ts'
);
const priorEnvironment = existsSync(generatedEnvironment)
  ? readFileSync(generatedEnvironment)
  : null;
const children = [];

function sanitizedEnvironment(source = process.env) {
  const env = { ...source };
  for (const name of [
    'SUPABASE_ACCESS_TOKEN',
    'SUPABASE_PROJECT_REF',
    'SUPABASE_ORG_ID',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_DB_PASSWORD',
    'SUPABASE_TEST_URL',
    'SUPABASE_TEST_SERVICE_ROLE_KEY',
    'SUPABASE_TEST_DATABASE_URL',
    'SUPABASE_TEST_DIRECT_URL',
    'DATABASE_URL',
    'DIRECT_URL',
    'BREVO_API_KEY',
    'BREVO_SENDER_EMAIL',
    'BREVO_SENDER_NAME',
    'NODE_OPTIONS',
  ]) {
    delete env[name];
  }
  return env;
}

function readBackendEnvironment() {
  const path = join(backend, '.env');
  const values = {};
  if (!existsSync(path)) return { ...process.env };

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    values[match[1]] = value;
  }
  return { ...values, ...process.env };
}

function runSupabase(args) {
  const cli = join(root, 'node_modules', 'supabase', 'dist', 'supabase.js');
  if (!existsSync(cli))
    throw new Error('Supabase CLI is missing; install the root dependencies.');
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: sanitizedEnvironment(),
    windowsHide: true,
  });
}

function selectedSupabaseEnvironment() {
  if (process.env['E2E_SUPABASE_TARGET'] === 'remote-test') {
    const url = backendEnvironment['SUPABASE_TEST_URL'];
    const databaseUrl =
      backendEnvironment['SUPABASE_TEST_DATABASE_URL'] ??
      backendEnvironment['TEST_DATABASE_URL'];
    const anonKey = backendEnvironment['SUPABASE_TEST_ANON_KEY'];
    const serviceRoleKey = backendEnvironment['SUPABASE_TEST_SERVICE_ROLE_KEY'];
    const directUrl =
      backendEnvironment['SUPABASE_TEST_DIRECT_URL'] ??
      backendEnvironment['TEST_DIRECT_URL'] ??
      databaseUrl;
    if (!url || !databaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error(
        'Remote E2E requires SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_SERVICE_ROLE_KEY, and SUPABASE_TEST_DATABASE_URL in backend/.env'
      );
    }

    const parsedUrl = new URL(url);
    const applicationUrl = backendEnvironment['SUPABASE_URL'];
    if (
      parsedUrl.protocol !== 'https:' ||
      !parsedUrl.hostname.endsWith('.supabase.co') ||
      (applicationUrl && parsedUrl.origin === new URL(applicationUrl).origin)
    ) {
      throw new Error(
        'Refusing remote E2E: the target must be an HTTPS Supabase test project different from SUPABASE_URL'
      );
    }
    return { url, databaseUrl, directUrl, anonKey, serviceRoleKey };
  }
  if (
    process.env['E2E_SUPABASE_TARGET'] &&
    process.env['E2E_SUPABASE_TARGET'] !== 'local'
  ) {
    throw new Error('E2E_SUPABASE_TARGET must be "local" or "remote-test"');
  }

  const started = runSupabase(['start']);
  if (started.error || started.status !== 0) {
    throw new Error(
      'Could not start local Supabase. Ensure Docker is running and try again.'
    );
  }

  const status = runSupabase(['status', '-o', 'env']);
  if (status.error || status.status !== 0) {
    throw new Error(
      'Could not read the local Supabase status; no remote project was contacted.'
    );
  }

  const values = new Map();
  for (const line of status.stdout.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Z_]+)=(?:"([^"]*)"|'([^']*)'|(.*))$/);
    if (match) values.set(match[1], match[2] ?? match[3] ?? match[4] ?? '');
  }
  const url = values.get('API_URL');
  const databaseUrl = values.get('DB_URL');
  const anonKey = values.get('ANON_KEY');
  const serviceRoleKey = values.get('SERVICE_ROLE_KEY');
  if (!url || !databaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error(
      'Local Supabase did not provide its API and database URLs and local keys.'
    );
  }
  const localHosts = ['localhost', '127.0.0.1', '::1', '[::1]'];
  if (
    ![url, databaseUrl].every((value) =>
      localHosts.includes(new URL(value).hostname)
    )
  ) {
    throw new Error(
      'Refusing to run E2E tests against a non-local Supabase URL.'
    );
  }
  return { url, databaseUrl, directUrl: databaseUrl, anonKey, serviceRoleKey };
}

function startProcess(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    windowsHide: true,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  child.on('error', (error) => {
    child.spawnError = error;
  });
  return child;
}

function startBackend(env) {
  const tsx = join(backend, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!existsSync(tsx))
    throw new Error(
      'Backend dependencies are missing; run npm run install:all.'
    );
  writeFileSync(backendLog, '');
  const child = startProcess(process.execPath, [tsx, 'src/server.ts'], {
    cwd: backend,
    env,
  });
  child.stdout.on('data', (chunk) => appendFileSync(backendLog, chunk));
  child.stderr.on('data', (chunk) => appendFileSync(backendLog, chunk));
  return child;
}

function startFrontend(env) {
  const angular = join(
    frontend,
    'node_modules',
    '@angular',
    'cli',
    'bin',
    'ng.js'
  );
  if (!existsSync(angular))
    throw new Error(
      'Frontend dependencies are missing; run npm run install:all.'
    );
  const configured = spawnSync(process.execPath, ['scripts/set-env.mjs'], {
    cwd: frontend,
    env,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (configured.error || configured.status !== 0) {
    throw new Error(
      'Could not configure the frontend for the local E2E services.'
    );
  }
  return startProcess(
    process.execPath,
    [angular, 'serve', '--host', 'localhost', '--port', '4200', '--no-open'],
    { cwd: frontend, env }
  );
}

async function waitForServer(url, child, readyLog) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.spawnError)
      throw new Error('Could not start a local E2E application.');
    if (child.exitCode !== null)
      throw new Error('A local E2E application exited before becoming ready.');
    try {
      const response = await fetch(url);
      if (response.ok) {
        await new Promise((resolveWait) => setTimeout(resolveWait, 100));
        if (child.exitCode !== null) {
          throw new Error(
            'A local E2E application exited before becoming ready.'
          );
        }
        if (!readyLog || readFileSync(backendLog, 'utf8').includes(readyLog)) {
          return;
        }
      }
    } catch {
      // The service is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  throw new Error(
    `Timed out waiting for local E2E service ${new URL(url).origin}.`
  );
}

async function stopChildren() {
  for (const child of children.reverse()) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
  await Promise.all(
    children.map((child) =>
      child.exitCode !== null || child.spawnError
        ? Promise.resolve()
        : new Promise((resolveWait) => child.once('exit', resolveWait))
    )
  );
}

function restoreGeneratedEnvironment() {
  if (priorEnvironment) {
    writeFileSync(generatedEnvironment, priorEnvironment);
  } else if (existsSync(generatedEnvironment)) {
    rmSync(generatedEnvironment);
  }
}

async function main() {
  mkdirSync(testResultsDir, { recursive: true });
  const supabase = selectedSupabaseEnvironment();
  const target = process.env['E2E_SUPABASE_TARGET'] ?? 'local';
  if (target === 'remote-test') {
    console.log(
      `Using isolated remote Supabase test project (${new URL(supabase.url).hostname}).`
    );
  }
  const sharedEnv = {
    ...sanitizedEnvironment(),
    E2E_SUPABASE_TARGET: target,
    E2E_STATE_FILE: stateFile,
    E2E_BACKEND_LOG_FILE: backendLog,
    SUPABASE_URL: supabase.url,
    SUPABASE_ANON_KEY: supabase.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
  };
  const backendEnv = {
    ...sharedEnv,
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: supabase.databaseUrl,
    DIRECT_URL: supabase.directUrl,
  };
  delete backendEnv['BREVO_API_KEY'];
  delete backendEnv['BREVO_SENDER_EMAIL'];
  delete backendEnv['BREVO_SENDER_NAME'];
  backendEnv['WEB_APP_URL'] = 'http://localhost:4200';
  backendEnv['CORS_ALLOWED_ORIGINS'] = 'http://localhost:4200';

  const frontendEnv = {
    ...sharedEnv,
    NG_APP_API_BASE_URL: 'http://localhost:3000',
    NG_APP_SUPABASE_URL: supabase.url,
    NG_APP_SUPABASE_ANON_KEY: supabase.anonKey,
  };
  delete frontendEnv['SUPABASE_SERVICE_ROLE_KEY'];
  delete frontendEnv['DATABASE_URL'];
  delete frontendEnv['DIRECT_URL'];

  const backendProcess = startBackend(backendEnv);
  await waitForServer(
    'http://127.0.0.1:3000/health',
    backendProcess,
    'Server listening on port 3000'
  );
  const frontendProcess = startFrontend(frontendEnv);
  await waitForServer('http://localhost:4200/login', frontendProcess);

  const cli = join(root, 'node_modules', '@playwright', 'test', 'cli.js');
  if (!existsSync(cli))
    throw new Error('Playwright is missing; install the root dependencies.');
  const playwrightProcess = startProcess(
    process.execPath,
    [
      cli,
      'test',
      '-c',
      'tests/e2e/playwright.config.ts',
      ...process.argv.slice(2),
    ],
    {
      cwd: root,
      env: sharedEnv,
      stdio: 'inherit',
    }
  );
  const result = await new Promise((resolve, reject) => {
    playwrightProcess.once('error', reject);
    playwrightProcess.once('exit', (code) => resolve(code));
  });
  process.exitCode = result ?? 1;
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'E2E runner failed.');
  process.exitCode = 1;
} finally {
  try {
    await stopChildren();
  } finally {
    try {
      restoreGeneratedEnvironment();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
