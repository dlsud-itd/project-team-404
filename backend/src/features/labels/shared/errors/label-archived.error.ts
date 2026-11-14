export class LabelArchivedError extends Error {
  constructor() {
    super('Archived labels cannot be attached to a task');
    this.name = 'LabelArchivedError';
  }
}
