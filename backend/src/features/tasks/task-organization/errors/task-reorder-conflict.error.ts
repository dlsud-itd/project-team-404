export class TaskReorderConflictError extends Error {
  constructor() {
    super('Task list changed; reload before reordering');
    this.name = 'TaskReorderConflictError';
  }
}
