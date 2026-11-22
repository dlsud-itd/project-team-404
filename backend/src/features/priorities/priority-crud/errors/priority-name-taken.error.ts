export class PriorityNameTakenError extends Error {
  constructor() {
    super('A priority with this name already exists');
    this.name = 'PriorityNameTakenError';
  }
}
