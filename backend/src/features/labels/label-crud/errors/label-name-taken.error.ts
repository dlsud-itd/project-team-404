export class LabelNameTakenError extends Error {
  constructor() {
    super('A label with this name already exists');
    this.name = 'LabelNameTakenError';
  }
}
