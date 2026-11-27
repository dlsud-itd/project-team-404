/** The default level is what new tasks get, so it can't be archived. */
export class DefaultPriorityArchiveError extends Error {
  constructor() {
    super('Choose another default priority before archiving this one');
    this.name = 'DefaultPriorityArchiveError';
  }
}
