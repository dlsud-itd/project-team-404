export class PriorityNotFoundError extends Error {
  constructor() {
    super('Priority not found');
    this.name = 'PriorityNotFoundError';
  }
}
