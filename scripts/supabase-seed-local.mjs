import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
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
const seedDirectory = path.join(repositoryRoot, 'supabase', 'seeds');
const seedFiles = readdirSync(seedDirectory)
  .filter((file) => file.endsWith('.sql'))
  .sort();

function runSupabase(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [supabaseCliPath, ...args], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        SUPABASE_DISABLE_UPDATE_CHECK: '1',
      },
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.once('error', (error) =>
      resolve({ code: 1, output: `${output}\n${error.message}` })
    );
    child.once('close', (code) => resolve({ code: code ?? 1, output }));
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

  if (seedFiles.length === 0) {
    console.error('No SQL seed files were found in supabase/seeds/.');
    process.exitCode = 1;
    return;
  }

  let hasErrors = false;
  for (const file of seedFiles) {
    const result = await runSupabase([
      '--output-format',
      'json',
      'db',
      'query',
      '--local',
      '--file',
      path.join('supabase', 'seeds', file),
    ]);
    if (result.code === 0) {
      console.log(`${file}: SUCCEEDED`);
    } else {
      console.error(`${file}: ERROR - ${oneLine(result.output)}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Local Supabase seed task failed: ${error.message}`);
  process.exitCode = 1;
});
