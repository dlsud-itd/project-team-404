export class TaskArchivedError extends Error {
  constructor() {
    super('Archived tasks are read-only');
    this.name = 'TaskArchivedError';
  }
}
