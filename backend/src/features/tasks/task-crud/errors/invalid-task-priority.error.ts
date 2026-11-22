export class InvalidTaskPriorityError extends Error {
  constructor() {
    super('Priority is not available for this user');
    this.name = 'InvalidTaskPriorityError';
  }
}
