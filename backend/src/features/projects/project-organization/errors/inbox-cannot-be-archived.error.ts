export class InboxCannotBeArchivedError extends Error {
  constructor() {
    super('Inbox project cannot be archived');
    this.name = 'InboxCannotBeArchivedError';
  }
}
