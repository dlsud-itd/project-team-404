import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const supabaseCliPath = path.join(
  repositoryRoot,
  'node_modules',
  'supabase',
  'dist',
  'supabase.js'
);
const seedFiles = [
  'supabase/seeds/001_users.sql',
  'supabase/seeds/002_inbox_projects.sql',
  'supabase/seeds/003_password_reset_tokens.sql',
  'supabase/seeds/004_projects.sql',
  'supabase/seeds/005_tasks.sql',
];
const verificationFile = 'supabase/verify_seeds.sql';

function runSupabase(args, { inherit = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [supabaseCliPath, ...args], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        SUPABASE_DISABLE_UPDATE_CHECK: '1',
      },
      stdio: inherit ? 'inherit' : ['inherit', 'pipe', 'pipe'],
    });

    if (inherit) {
      child.once('error', (error) =>
        resolve({ code: 1, error: error.message })
      );
      child.once('close', (code) => resolve({ code: code ?? 1 }));
      return;
    }

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', (error) =>
      resolve({ code: 1, error: error.message, stdout, stderr })
    );
    child.once('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function readVerificationRows(output) {
  try {
    const result = JSON.parse(output);
    const rows = Array.isArray(result) ? result : result.rows;
    if (Array.isArray(rows)) {
      return new Map(
        rows
          .filter(
            (row) =>
              typeof row?.seed_file === 'string' &&
              (row.status === 'PASS' || row.status === 'FAIL')
          )
          .map((row) => [row.seed_file, row.status === 'PASS'])
      );
    }
  } catch {
    // Fall through to the CLI's text-table output format.
  }

  const rows = new Map();
  for (const line of output.split(/\r?\n/)) {
    const cells = line
      .split(/[│|]/)
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (
      cells.length >= 2 &&
      seedFiles.some((file) => file.endsWith(cells[0])) &&
      (cells[1] === 'PASS' || cells[1] === 'FAIL')
    ) {
      rows.set(cells[0], cells[1] === 'PASS');
    }
  }
  return rows;
}

function oneLine(value) {
  return value.replace(/\s+/g, ' ').trim();
}

async function verifySeeds() {
  const result = await runSupabase([
    '--output-format',
    'json',
    'db',
    'query',
    '--linked',
    '--file',
    verificationFile,
  ]);
  if (result.code !== 0) {
    return {
      error: result.error ?? oneLine(`${result.stdout}\n${result.stderr}`),
    };
  }
  const rows = readVerificationRows(result.stdout);
  if (seedFiles.some((file) => !rows.has(path.basename(file)))) {
    return {
      error: `Could not read verification results: ${oneLine(result.stdout)}`,
    };
  }
  return { rows };
}

async function main() {
  if (!existsSync(supabaseCliPath)) {
    console.error(
      'Supabase CLI is not installed. Run npm install before using this task.'
    );
    process.exitCode = 1;
    return;
  }

  if (process.argv.includes('--reset')) {
    const reset = await runSupabase(['db', 'reset', '--linked', '--no-seed'], {
      inherit: true,
    });
    if (reset.code !== 0) {
      process.exitCode = reset.code;
      return;
    }
  }

  const before = await verifySeeds();
  if (before.error) {
    for (const file of seedFiles) {
      console.log(
        `${path.basename(file)}: ERROR - Could not check whether it was already seeded: ${before.error}`
      );
    }
    process.exitCode = 1;
    return;
  }

  const execution = new Map();
  for (const file of seedFiles) {
    if (before.rows.get(path.basename(file))) {
      execution.set(file, { skipped: true, succeeded: true });
      continue;
    }

    const result = await runSupabase([
      '--output-format',
      'json',
      'db',
      'query',
      '--linked',
      '--file',
      file,
    ]);
    execution.set(file, {
      skipped: false,
      succeeded: result.code === 0,
      error: result.error ?? oneLine(`${result.stdout}\n${result.stderr}`),
    });
  }

  const after = await verifySeeds();
  let hasErrors = Boolean(after.error);
  for (const file of seedFiles) {
    const name = path.basename(file);
    const result = execution.get(file);
    const verified = after.rows?.get(name) === true;
    if (!after.error && verified && result.skipped) {
      console.log(`${name}: SKIPPED (already seeded)`);
    } else if (!after.error && verified && result.succeeded) {
      console.log(`${name}: SUCCEEDED`);
    } else {
      const detail =
        result.error ||
        after.error ||
        `Post-seed verification failed${result.skipped ? '' : ' after execution'}`;
      console.log(`${name}: ERROR - ${oneLine(detail)}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Supabase seed task failed: ${error.message}`);
  process.exitCode = 1;
});
