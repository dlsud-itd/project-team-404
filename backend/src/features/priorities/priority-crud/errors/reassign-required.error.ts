export class ReassignRequiredError extends Error {
  constructor() {
    super('Choose a replacement priority before deleting this one');
    this.name = 'ReassignRequiredError';
  }
}
