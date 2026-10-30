export class LabelNotFoundError extends Error {
  constructor() {
    super('Label not found');
    this.name = 'LabelNotFoundError';
  }
}
