export class LastPriorityError extends Error {
  constructor() {
    super('A user must keep at least one priority level');
    this.name = 'LastPriorityError';
  }
}
