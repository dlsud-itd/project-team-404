/** A repeating task's occurrence can't be completed before the day it is for. */
export class TaskNotDueYetError extends Error {
  constructor(readonly availableOn: string) {
    super(`This occurrence can't be completed until ${availableOn}`);
    this.name = 'TaskNotDueYetError';
  }
}
