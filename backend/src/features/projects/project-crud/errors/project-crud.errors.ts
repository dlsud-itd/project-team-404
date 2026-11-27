export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found');
    this.name = 'ProjectNotFoundError';
  }
}

export class ProjectLimitReachedError extends Error {
  readonly code = 'project-limit-reached';

  constructor(limit: number) {
    super(
      `You can have up to ${limit} active projects. Archive or delete one to add another.`
    );
    this.name = 'ProjectLimitReachedError';
  }
}

export class InboxProjectMutationError extends Error {
  constructor() {
    super('Inbox project cannot be edited or deleted');
    this.name = 'InboxProjectMutationError';
  }
}
