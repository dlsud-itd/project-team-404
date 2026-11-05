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

function oneLine(value) {
  return value.replace(/\s+/g, ' ').trim();
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

  let hasErrors = false;
  for (const file of seedFiles) {
    const result = await runSupabase([
      '--output-format',
      'json',
      'db',
      'query',
      '--linked',
      '--file',
      file,
    ]);
    const output = oneLine(`${result.stdout}\n${result.stderr}`);
    if (result.code === 0) {
      console.log(`${path.basename(file)}: SUCCEEDED`);
    } else {
      const detail =
        result.error ||
        output ||
        `Supabase CLI exited with code ${result.code}`;
      console.log(`${path.basename(file)}: ERROR - ${oneLine(detail)}`);
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
