import { isReadOnlyProject, projectPermissions } from './project-permissions.util';

describe('project permissions', () => {
  it('treats the Inbox as read-only', () => {
    expect(isReadOnlyProject({ isInbox: true })).toBe(true);
    expect(projectPermissions({ isInbox: true })).toEqual({ canEdit: false, canDelete: false });
  });

  it('lets the user edit and delete any other project', () => {
    expect(isReadOnlyProject({ isInbox: false })).toBe(false);
    expect(projectPermissions({ isInbox: false })).toEqual({ canEdit: true, canDelete: true });
  });
});
