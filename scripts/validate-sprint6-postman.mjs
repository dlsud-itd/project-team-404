import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'tests/postman/17-sprint-6-streaks-views');

const [collection, environment] = await Promise.all([
  readFile(
    path.join(
      directory,
      'Project-Team-404 API - 17-sprint-6-streaks-views.postman_collection.json'
    ),
    'utf8'
  ).then(JSON.parse),
  readFile(
    path.join(
      directory,
      'Project-Team-404 Local (17-sprint-6-streaks-views).postman_environment.json'
    ),
    'utf8'
  ).then(JSON.parse),
]);

const folder = collection.item[0];
const requests = folder.item;
if (requests.length !== 20)
  throw new Error(`Expected 20 requests, found ${requests.length}`);

const requiredEnvironment = [
  'baseUrl',
  'token',
  'tokenB',
  'projectId',
  'taskId',
  'taskId2',
  'activeTaskIds',
  'boardActiveIds',
  'boardCompletedIds',
];
for (const key of requiredEnvironment) {
  if (!environment.values.some((entry) => entry.key === key)) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const requiredPaths = [
  '/auth/login',
  '/tasks',
  '/tasks/reorder',
  '/tasks/board',
  '/tasks/board/reorder',
  '/tasks/timeline',
  '/dashboard/streaks',
];
const serialized = JSON.stringify(collection);
for (const requiredPath of requiredPaths) {
  if (!serialized.includes(requiredPath))
    throw new Error(`Missing route: ${requiredPath}`);
}

for (const [index, request] of requests.entries()) {
  for (const event of request.event ?? []) {
    for (const source of event.script?.exec ?? []) {
      try {
        new Function(source);
      } catch (error) {
        throw new Error(
          `Invalid script in request ${index + 1} (${request.name}): ${error.message}`
        );
      }
    }
  }
}

const requestNames = requests.map(({ name }) => name);
if (
  requestNames.indexOf('10 Get tasks and capture active IDs') >
    requestNames.indexOf('11 Reorder complete active task set') ||
  requestNames.indexOf('13 Get project board') >
    requestNames.indexOf('14 Reorder board columns')
) {
  throw new Error(
    'Task IDs must be captured before their corresponding reorder request'
  );
}

console.log(`Sprint 6 Postman collection: PASS (${requests.length} requests)`);
