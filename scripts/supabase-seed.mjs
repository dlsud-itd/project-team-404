import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
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
  'supabase/seeds/006_filtering.sql',
];
const verificationFile = 'supabase/verify_seeds.sql';

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

function splitStatements(sql) {
  const statements = [];
  let start = 0;
  let state = 'normal';
  let blockDepth = 0;
  let dollarTag = '';

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];

    if (state === 'single') {
      if (character === "'" && next === "'") {
        index += 1;
      } else if (character === "'") {
        state = 'normal';
      }
      continue;
    }

    if (state === 'double') {
      if (character === '"' && next === '"') {
        index += 1;
      } else if (character === '"') {
        state = 'normal';
      }
      continue;
    }

    if (state === 'line-comment') {
      if (character === '\n') state = 'normal';
      continue;
    }

    if (state === 'block-comment') {
      if (character === '/' && next === '*') {
        blockDepth += 1;
        index += 1;
      } else if (character === '*' && next === '/') {
        blockDepth -= 1;
        index += 1;
        if (blockDepth === 0) state = 'normal';
      }
      continue;
    }

    if (state === 'dollar') {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        state = 'normal';
      }
      continue;
    }

    if (character === "'") {
      state = 'single';
    } else if (character === '"') {
      state = 'double';
    } else if (character === '-' && next === '-') {
      state = 'line-comment';
      index += 1;
    } else if (character === '/' && next === '*') {
      state = 'block-comment';
      blockDepth = 1;
      index += 1;
    } else if (character === '$') {
      const tag = sql
        .slice(index)
        .match(/^\$[A-Za-z_][A-Za-z\d_]*\$|^\$\$/)?.[0];
      if (tag) {
        dollarTag = tag;
        state = 'dollar';
        index += tag.length - 1;
      }
    } else if (character === ';') {
      const statement = sql.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }

  const finalStatement = sql.slice(start).trim();
  if (finalStatement) statements.push(finalStatement);
  return statements;
}

async function main() {
  if (!existsSync(supabaseCliPath)) {
    console.error(
      'Supabase CLI is not installed. Run npm install before using this task.'
    );
    process.exitCode = 1;
    return;
  }

  const target = process.argv.includes('--local') ? '--local' : '--linked';
  let hasErrors = false;
  for (const file of seedFiles) {
    const sql = await readFile(path.join(repositoryRoot, file), 'utf8');
    const statements = splitStatements(sql);
    let fileError;
    for (const statement of statements) {
      const result = await runSupabase([
        '--output-format',
        'json',
        'db',
        'query',
        target,
        statement,
      ]);
      if (result.code !== 0) {
        fileError =
          result.error ||
          oneLine(`${result.stdout}\n${result.stderr}`) ||
          `Supabase CLI exited with code ${result.code}`;
        break;
      }
    }

    if (!fileError) {
      console.log(`${path.basename(file)}: SUCCEEDED`);
    } else {
      console.log(`${path.basename(file)}: ERROR - ${oneLine(fileError)}`);
      hasErrors = true;
    }
  }

  if (!hasErrors) {
    const sql = await readFile(
      path.join(repositoryRoot, verificationFile),
      'utf8'
    );
    let fileError;
    for (const statement of splitStatements(sql)) {
      const result = await runSupabase([
        '--output-format',
        'json',
        'db',
        'query',
        target,
        statement,
      ]);
      if (result.code !== 0) {
        fileError =
          result.error ||
          oneLine(`${result.stdout}\n${result.stderr}`) ||
          `Supabase CLI exited with code ${result.code}`;
        break;
      }
    }

    if (!fileError) {
      console.log(`${path.basename(verificationFile)}: PASS`);
    } else {
      console.log(
        `${path.basename(verificationFile)}: FAIL - ${oneLine(fileError)}`
      );
      hasErrors = true;
    }
  } else {
    console.log(`${path.basename(verificationFile)}: SKIPPED - seed failed`);
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Supabase seed task failed: ${error.message}`);
  process.exitCode = 1;
});
