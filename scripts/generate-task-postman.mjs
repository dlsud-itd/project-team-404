import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import prettier from 'prettier';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = path.join(root, 'tests/postman/337-task-crud');
const baseUrl = '{{baseUrl}}';
const [frontendEnvExample, backendEnvExample] = await Promise.all([
  readFile(path.join(root, 'frontend/.env.example'), 'utf8'),
  readFile(path.join(root, 'backend/.env.example'), 'utf8'),
]);

function readEnvValue(contents, key) {
  const line = contents
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));
  return line
    ?.trim()
    .slice(key.length + 1)
    .trim();
}

const backendPort = readEnvValue(backendEnvExample, 'PORT') || '3000';
const frontendApiBaseUrl = readEnvValue(
  frontendEnvExample,
  'NG_APP_API_BASE_URL'
);
const localApiBaseUrl = frontendApiBaseUrl || `http://localhost:${backendPort}`;
const postmanBaseUrl = `${localApiBaseUrl.replace(/\/+$/, '')}/api`;

function testEvent(status, assertions = []) {
  return {
    listen: 'test',
    script: {
      type: 'text/javascript',
      exec: [
        `pm.test('Status is ${status}', function () { pm.response.to.have.status(${status}); });`,
        ...assertions,
      ],
    },
  };
}

function item({
  name,
  method,
  path: requestPath,
  body,
  token = 'token',
  status,
  assertions = [],
  preRequest,
}) {
  const headers = body
    ? [{ key: 'Content-Type', value: 'application/json' }]
    : [];
  if (token) {
    headers.push({ key: 'Authorization', value: `Bearer {{${token}}}` });
  }
  const events = [];
  if (preRequest) {
    events.push({
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: preRequest },
    });
  }
  events.push(testEvent(status, assertions));
  const cleanPath = requestPath.split('?')[0];
  const query = requestPath.includes('?')
    ? requestPath
        .split('?')[1]
        .split('&')
        .map((pair) => {
          const [key, value] = pair.split('=');
          return { key, value };
        })
    : [];
  const rawBody = body
    ? JSON.stringify(body, null, 2).replace(
        /(\"projectId\"\s*:\s*)\"{{([^}]+)}}\"/g,
        '$1{{$2}}'
      )
    : undefined;
  return {
    name,
    event: events,
    request: {
      method,
      header: headers,
      ...(body ? { body: { mode: 'raw', raw: rawBody } } : {}),
      url: {
        raw: `${baseUrl}${requestPath}`,
        host: [baseUrl],
        path: cleanPath.split('/').filter(Boolean),
        ...(query.length ? { query } : {}),
      },
    },
  };
}

const bodyCheck = (label, condition) =>
  `pm.test('${label}', function () { ${condition} });`;
const hasError = bodyCheck(
  'Response contains an error message',
  "pm.expect(pm.response.json()).to.have.property('error').that.is.a('string');"
);
const noContent = bodyCheck(
  'Response body is empty',
  "pm.expect(pm.response.text()).to.equal('');"
);

const taskFolder = {
  name: '337-task-crud',
  description:
    'Task CRUD cases for ownership, validation, list filters/paging, soft deletion, and authentication.',
  item: [
    item({
      name: 'Login - James (token)',
      method: 'POST',
      path: '/auth/login',
      token: null,
      status: 200,
      body: { identifier: 'james@example.com', password: 'password123' },
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Login returns a token',
          "pm.expect(response.token).to.be.a('string').and.not.empty;"
        ),
        "pm.environment.set('token', response.token);",
      ],
    }),
    item({
      name: 'Login - Harvey (tokenB)',
      method: 'POST',
      path: '/auth/login',
      token: null,
      status: 200,
      body: { identifier: 'harvey@example.com', password: 'password123' },
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Login returns a token',
          "pm.expect(response.token).to.be.a('string').and.not.empty;"
        ),
        "pm.environment.set('tokenB', response.token);",
      ],
    }),
    item({
      name: 'Setup - Create James project',
      method: 'POST',
      path: '/projects',
      status: 201,
      body: {
        name: 'Postman CRUD project',
        description: 'Task CRUD test data',
        color: '#f59e0b',
      },
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Project response has an ID',
          "pm.expect(response.id).to.be.a('number');"
        ),
        "pm.environment.set('projectId', String(response.id));",
      ],
    }),
    item({
      name: 'Setup - Create second James project',
      method: 'POST',
      path: '/projects',
      status: 201,
      body: {
        name: 'Postman CRUD destination',
        description: 'Task move test data',
        color: '#10b981',
      },
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Project response has an ID',
          "pm.expect(response.id).to.be.a('number');"
        ),
        "pm.environment.set('projectId2', String(response.id));",
      ],
    }),
    item({
      name: 'Setup - Create Harvey project',
      method: 'POST',
      path: '/projects',
      token: 'tokenB',
      status: 201,
      body: {
        name: 'Harvey Postman project',
        description: 'Other-user ownership test',
        color: '#3b82f6',
      },
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Project response has an ID',
          "pm.expect(response.id).to.be.a('number');"
        ),
        "pm.environment.set('projectIdB', String(response.id));",
      ],
    }),
    item({
      name: 'Setup - Create project to soft-delete',
      method: 'POST',
      path: '/projects',
      status: 201,
      body: {
        name: 'Postman deleted project',
        description: 'Deleted project task rejection',
        color: '#ef4444',
      },
      assertions: [
        'const response = pm.response.json();',
        "pm.environment.set('deletedProjectId', String(response.id));",
      ],
    }),
    item({
      name: 'Setup - Soft-delete project',
      method: 'DELETE',
      path: '/projects/{{deletedProjectId}}',
      status: 204,
      assertions: [noContent],
    }),
    item({
      name: 'Create task in own project',
      method: 'POST',
      path: '/tasks',
      status: 201,
      body: {
        title: 'Postman primary task',
        description: 'Task created in an owned project',
        projectId: '{{projectId}}',
      },
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Created task has expected title and description',
          "pm.expect(response.title).to.equal('Postman primary task'); pm.expect(response.description).to.equal('Task created in an owned project');"
        ),
        "pm.environment.set('taskId', String(response.id));",
      ],
    }),
    item({
      name: 'Setup - Create active task for paging',
      method: 'POST',
      path: '/tasks',
      status: 201,
      body: {
        title: 'Postman page task one',
        description: 'First active page fixture',
        projectId: '{{projectId}}',
      },
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Created task belongs to the project',
          "pm.expect(response.projectId).to.equal(Number(pm.environment.get('projectId')));"
        ),
        "pm.environment.set('pageTaskId', String(response.id));",
      ],
    }),
    item({
      name: 'Setup - Create second active task for paging',
      method: 'POST',
      path: '/tasks',
      status: 201,
      body: {
        title: 'Postman page task two',
        description: 'Second active page fixture',
        projectId: '{{projectId}}',
      },
      assertions: [
        'const response = pm.response.json();',
        "pm.environment.set('pageTaskTwoId', String(response.id));",
      ],
    }),
    item({
      name: 'Setup - Create completed task',
      method: 'POST',
      path: '/tasks',
      status: 201,
      body: {
        title: 'Postman completed task',
        description: 'Completed status fixture',
        projectId: '{{projectId}}',
        isDone: true,
      },
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Task is completed',
          'pm.expect(response.isDone).to.equal(true);'
        ),
        "pm.environment.set('completedTaskId', String(response.id));",
      ],
    }),
    item({
      name: 'Setup - Create Harvey task',
      method: 'POST',
      path: '/tasks',
      token: 'tokenB',
      status: 201,
      body: {
        title: 'Harvey private task',
        description: 'Must not appear for James',
        projectId: '{{projectIdB}}',
      },
      assertions: [
        'const response = pm.response.json();',
        "pm.environment.set('taskIdB', String(response.id));",
      ],
    }),
    item({
      name: 'Setup - Create task to soft-delete',
      method: 'POST',
      path: '/tasks',
      status: 201,
      body: {
        title: 'Postman delete fixture',
        description: 'Soft-delete behavior fixture',
        projectId: '{{projectId}}',
      },
      assertions: [
        'const response = pm.response.json();',
        "pm.environment.set('deleteTaskId', String(response.id));",
      ],
    }),
    item({
      name: 'Create task with empty title returns 400',
      method: 'POST',
      path: '/tasks',
      status: 400,
      body: {
        title: '   ',
        description: 'Invalid empty title',
        projectId: '{{projectId}}',
      },
      assertions: [hasError],
    }),
    item({
      name: 'Create task with over-long title returns 400',
      method: 'POST',
      path: '/tasks',
      status: 400,
      body: {
        title: '{{longTitle}}',
        description: 'Invalid over-long title',
        projectId: '{{projectId}}',
      },
      preRequest: ["pm.variables.set('longTitle', 'x'.repeat(201));"],
      assertions: [hasError],
    }),
    item({
      name: 'Create task with invalid body returns 400',
      method: 'POST',
      path: '/tasks',
      status: 400,
      body: { title: 12, projectId: '{{projectId}}', unsupported: true },
      assertions: [hasError],
    }),
    item({
      name: 'Create task with missing project returns 404',
      method: 'POST',
      path: '/tasks',
      status: 404,
      body: {
        title: 'Missing project fixture',
        description: 'Must not be created',
        projectId: '{{missingProjectId}}',
      },
      assertions: [hasError],
    }),
    item({
      name: 'Create task with deleted project returns 404',
      method: 'POST',
      path: '/tasks',
      status: 404,
      body: {
        title: 'Deleted project fixture',
        description: 'Must not be created',
        projectId: '{{deletedProjectId}}',
      },
      assertions: [hasError],
    }),
    item({
      name: 'Create task in another user project returns 404',
      method: 'POST',
      path: '/tasks',
      status: 404,
      body: {
        title: 'Foreign project fixture',
        description: 'Must not be created',
        projectId: '{{projectIdB}}',
      },
      assertions: [hasError],
    }),
    item({
      name: 'Rejected project assignments create no tasks',
      method: 'GET',
      path: '/tasks?status=all&page=1&pageSize=100',
      status: 200,
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Rejected tasks were not persisted',
          "const titles = response.map((task) => task.title); pm.expect(titles).not.to.include('Missing project fixture'); pm.expect(titles).not.to.include('Deleted project fixture'); pm.expect(titles).not.to.include('Foreign project fixture');"
        ),
      ],
    }),
    item({
      name: 'List active tasks filtered by project',
      method: 'GET',
      path: '/tasks?projectId={{projectId}}&status=active&page=1&pageSize=20',
      status: 200,
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Only active tasks from the requested project are returned',
          "pm.expect(response).to.be.an('array'); response.forEach((task) => { pm.expect(task.projectId).to.equal(Number(pm.environment.get('projectId'))); pm.expect(task.isDone).to.equal(false); });"
        ),
        bodyCheck(
          'Other-user task is excluded',
          "pm.expect(response.map((task) => String(task.id))).not.to.include(pm.environment.get('taskIdB'));"
        ),
      ],
    }),
    item({
      name: 'List completed tasks by status',
      method: 'GET',
      path: '/tasks?projectId={{projectId}}&status=completed&page=1&pageSize=20',
      status: 200,
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Only completed tasks are returned',
          "pm.expect(response).to.be.an('array').and.not.empty; response.forEach((task) => pm.expect(task.isDone).to.equal(true));"
        ),
      ],
    }),
    item({
      name: 'List tasks page one',
      method: 'GET',
      path: '/tasks?projectId={{projectId}}&status=active&page=1&pageSize=1',
      status: 200,
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Page one honors page size',
          "pm.expect(response).to.be.an('array').with.length(1);"
        ),
        "pm.environment.set('firstPageTaskId', String(response[0].id));",
      ],
    }),
    item({
      name: 'List tasks page two',
      method: 'GET',
      path: '/tasks?projectId={{projectId}}&status=active&page=2&pageSize=1',
      status: 200,
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Page two honors page size and advances results',
          "pm.expect(response).to.be.an('array').with.length(1); pm.expect(String(response[0].id)).not.to.equal(pm.environment.get('firstPageTaskId'));"
        ),
      ],
    }),
    item({
      name: 'Get own task returns 200',
      method: 'GET',
      path: '/tasks/{{taskId}}',
      status: 200,
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Response is the requested task',
          "pm.expect(String(response.id)).to.equal(pm.environment.get('taskId')); pm.expect(response.title).to.equal('Postman primary task');"
        ),
      ],
    }),
    item({
      name: 'Get another user task returns 404',
      method: 'GET',
      path: '/tasks/{{taskIdB}}',
      status: 404,
      assertions: [hasError],
    }),
    item({
      name: 'Get missing task returns 404',
      method: 'GET',
      path: '/tasks/{{missingTaskId}}',
      status: 404,
      assertions: [hasError],
    }),
    item({
      name: 'Get malformed task ID returns 400',
      method: 'GET',
      path: '/tasks/not-an-integer',
      status: 400,
      assertions: [hasError],
    }),
    item({
      name: 'Update task returns the API success message',
      method: 'PUT',
      path: '/tasks/{{taskId}}',
      status: 200,
      body: {
        title: 'Postman updated task',
        description: 'Updated and persisted description',
      },
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Update response matches the API spec',
          "pm.expect(response.taskId).to.equal(Number(pm.environment.get('taskId'))); pm.expect(response.message).to.equal('Task updated successfully');"
        ),
      ],
    }),
    item({
      name: 'Updated title and description persist',
      method: 'GET',
      path: '/tasks/{{taskId}}',
      status: 200,
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Updated fields persist',
          "pm.expect(response.title).to.equal('Postman updated task'); pm.expect(response.description).to.equal('Updated and persisted description');"
        ),
      ],
    }),
    item({
      name: 'Move task to another owned project',
      method: 'PUT',
      path: '/tasks/{{taskId}}',
      status: 200,
      body: { projectId: '{{projectId2}}' },
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Move response matches the update API spec',
          "pm.expect(response.taskId).to.equal(Number(pm.environment.get('taskId'))); pm.expect(response.message).to.equal('Task updated successfully');"
        ),
      ],
    }),
    item({
      name: 'Move task to another user project is rejected',
      method: 'PUT',
      path: '/tasks/{{taskId}}',
      status: 404,
      body: { projectId: '{{projectIdB}}' },
      assertions: [hasError],
    }),
    item({
      name: 'Task remains in owned project after rejected move',
      method: 'GET',
      path: '/tasks/{{taskId}}',
      status: 200,
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Rejected move did not change project',
          "pm.expect(response.projectId).to.equal(Number(pm.environment.get('projectId2')));"
        ),
      ],
    }),
    item({
      name: 'Delete task is a soft delete',
      method: 'DELETE',
      path: '/tasks/{{deleteTaskId}}',
      status: 200,
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Delete response matches the API spec',
          "pm.expect(response.message).to.equal('Task deleted successfully');"
        ),
      ],
    }),
    item({
      name: 'Soft-deleted task leaves the list',
      method: 'GET',
      path: '/tasks?projectId={{projectId}}&status=all&page=1&pageSize=100',
      status: 200,
      assertions: [
        'const response = pm.response.json();',
        bodyCheck(
          'Deleted task is excluded from list',
          "pm.expect(response.map((task) => String(task.id))).not.to.include(pm.environment.get('deleteTaskId'));"
        ),
      ],
    }),
    item({
      name: 'Get soft-deleted task returns 404',
      method: 'GET',
      path: '/tasks/{{deleteTaskId}}',
      status: 404,
      assertions: [hasError],
    }),
    item({
      name: 'Second delete returns 404',
      method: 'DELETE',
      path: '/tasks/{{deleteTaskId}}',
      status: 404,
      assertions: [hasError],
    }),
    item({
      name: 'Create task without token returns 401',
      method: 'POST',
      path: '/tasks',
      token: null,
      status: 401,
      body: { title: 'Unauthenticated create', projectId: '{{projectId}}' },
      assertions: [hasError],
    }),
    item({
      name: 'List tasks without token returns 401',
      method: 'GET',
      path: '/tasks',
      token: null,
      status: 401,
      assertions: [hasError],
    }),
    item({
      name: 'Get task without token returns 401',
      method: 'GET',
      path: '/tasks/{{taskId}}',
      token: null,
      status: 401,
      assertions: [hasError],
    }),
    item({
      name: 'Update task without token returns 401',
      method: 'PUT',
      path: '/tasks/{{taskId}}',
      token: null,
      status: 401,
      body: { title: 'Unauthenticated update' },
      assertions: [hasError],
    }),
    item({
      name: 'Delete task without token returns 401',
      method: 'DELETE',
      path: '/tasks/{{taskId}}',
      token: null,
      status: 401,
      assertions: [hasError],
    }),
  ],
};

const collection = {
  info: {
    _postman_id: 'a0f4e431-5c0c-4f2e-bd37-f2dbdb1a3370',
    name: 'Project-Team-404 API',
    description: 'Project API collection with the 337 Task CRUD case folder.',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [taskFolder],
  variable: [
    {
      key: 'baseUrl',
      value: postmanBaseUrl,
      type: 'string',
      description:
        'Derived from NG_APP_API_BASE_URL and backend PORT examples.',
    },
    {
      key: 'token',
      value: 'PASTE_TOKEN_OR_RUN_JAMES_LOGIN_FIRST',
      type: 'string',
      description: 'Placeholder only; the James login request replaces it.',
    },
    {
      key: 'tokenB',
      value: 'PASTE_TOKEN_OR_RUN_HARVEY_LOGIN_FIRST',
      type: 'string',
      description: 'Placeholder only; the Harvey login request replaces it.',
    },
    {
      key: 'projectId',
      value: '1',
      type: 'string',
      description: 'Sample only; setup creates and replaces it.',
    },
    {
      key: 'projectId2',
      value: '2',
      type: 'string',
      description: 'Sample only; setup creates and replaces it.',
    },
    {
      key: 'projectIdB',
      value: '3',
      type: 'string',
      description: 'Sample only; setup creates and replaces it.',
    },
    {
      key: 'deletedProjectId',
      value: '4',
      type: 'string',
      description: 'Sample only; setup creates and replaces it.',
    },
    {
      key: 'taskId',
      value: '1',
      type: 'string',
      description: 'Sample only; task creation replaces it.',
    },
    {
      key: 'taskIdB',
      value: '2',
      type: 'string',
      description: 'Sample only; setup replaces it.',
    },
    {
      key: 'deleteTaskId',
      value: '3',
      type: 'string',
      description: 'Sample only; setup replaces it.',
    },
    {
      key: 'pageTaskId',
      value: '4',
      type: 'string',
      description: 'Sample only; setup replaces it.',
    },
    {
      key: 'pageTaskTwoId',
      value: '5',
      type: 'string',
      description: 'Sample only; setup replaces it.',
    },
    {
      key: 'firstPageTaskId',
      value: '4',
      type: 'string',
      description: 'Sample only; paging request replaces it.',
    },
    {
      key: 'completedTaskId',
      value: '6',
      type: 'string',
      description: 'Sample only; setup replaces it.',
    },
    { key: 'missingProjectId', value: '999999999', type: 'string' },
    { key: 'missingTaskId', value: '999999999', type: 'string' },
  ],
};

const environment = {
  id: 'd8c67329-9d3f-4f4d-9b44-1d4f79ec7d64',
  name: 'Project-Team-404 Local (337 Task CRUD)',
  values: [
    ['baseUrl', postmanBaseUrl, 'Local API URL from the example env files.'],
    [
      'token',
      'PASTE_TOKEN_OR_RUN_JAMES_LOGIN_FIRST',
      'Placeholder only; the James login request replaces it.',
    ],
    [
      'tokenB',
      'PASTE_TOKEN_OR_RUN_HARVEY_LOGIN_FIRST',
      'Placeholder only; the Harvey login request replaces it.',
    ],
    ['projectId', '1', 'Sample only; setup creates and replaces it.'],
    ['projectId2', '2', 'Sample only; setup creates and replaces it.'],
    ['projectIdB', '3', 'Sample only; setup creates and replaces it.'],
    ['deletedProjectId', '4', 'Sample only; setup creates and replaces it.'],
    ['taskId', '1', 'Sample only; task creation replaces it.'],
    ['taskIdB', '2', 'Sample only; setup replaces it.'],
    ['deleteTaskId', '3', 'Sample only; setup replaces it.'],
    ['pageTaskId', '4', 'Sample only; setup replaces it.'],
    ['pageTaskTwoId', '5', 'Sample only; setup replaces it.'],
    ['firstPageTaskId', '4', 'Sample only; paging request replaces it.'],
    ['completedTaskId', '6', 'Sample only; setup replaces it.'],
    [
      'missingProjectId',
      '999999999',
      'Deliberately nonexistent project ID for the 404 case.',
    ],
    [
      'missingTaskId',
      '999999999',
      'Deliberately nonexistent task ID for the 404 case.',
    ],
  ].map(([key, value, description]) => ({
    key,
    value,
    description,
    enabled: true,
    type: 'default',
  })),
  _postman_variable_scope: 'environment',
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: 'Postman Collection v2.1',
};

await Promise.all([mkdir(outputDirectory, { recursive: true })]);
const collectionJson = await prettier.format(JSON.stringify(collection), {
  parser: 'json',
});
const environmentJson = await prettier.format(JSON.stringify(environment), {
  parser: 'json',
});
await writeFile(
  path.join(outputDirectory, 'Project-Team-404.postman_collection.json'),
  collectionJson
);
await writeFile(
  path.join(outputDirectory, 'Project-Team-404.postman_environment.json'),
  environmentJson
);
