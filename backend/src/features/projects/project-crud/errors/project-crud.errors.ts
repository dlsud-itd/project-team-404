export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found');
    this.name = 'ProjectNotFoundError';
  }
}

export class InboxProjectMutationError extends Error {
  constructor() {
    super('Inbox project cannot be edited or deleted');
    this.name = 'InboxProjectMutationError';
  }
}
