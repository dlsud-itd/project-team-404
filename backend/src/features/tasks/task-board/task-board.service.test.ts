import { describe, expect, it, vi } from 'vitest';
import { TaskNotFoundError } from '../task-crud/errors/task-not-found.error';
import { TaskBoardService } from './task-board.service';

function dependencies() {
  return {
    findOwnedProject: vi.fn().mockResolvedValue({ isArchived: false }),
    listBoardTasks: vi.fn().mockResolvedValue({
      projectId: 7,
      columns: { todo: [], inProgress: [], done: [] },
      counts: { todo: 0, inProgress: 0, done: 0 },
    }),
    moveBoardTask: vi.fn().mockResolvedValue({
      projectId: 7,
      boardStatus: 'in_progress' as const,
      tasks: [11],
    }),
  };
}

describe('TaskBoardService', () => {
  it('scopes board reads to an active owned project', async () => {
    const deps = dependencies();
    const service = new TaskBoardService(deps);
    const query = { projectId: 7, status: 'all' as const };

    await expect(service.list('user-1', query)).resolves.toEqual(
      expect.objectContaining({ projectId: 7 })
    );
    expect(deps.findOwnedProject).toHaveBeenCalledWith(7, 'user-1');
    expect(deps.listBoardTasks).toHaveBeenCalledWith('user-1', query);
  });

  it('lists every active project when no project is given', async () => {
    const deps = dependencies();
    const service = new TaskBoardService(deps);
    const query = { status: 'all' as const };

    await service.list('user-1', query);

    expect(deps.findOwnedProject).not.toHaveBeenCalled();
    expect(deps.listBoardTasks).toHaveBeenCalledWith('user-1', query);
  });

  it('hides missing, foreign, or archived projects', async () => {
    const deps = dependencies();
    vi.mocked(deps.findOwnedProject).mockResolvedValue(null);
    const service = new TaskBoardService(deps);

    await expect(
      service.list('user-1', { projectId: 99, status: 'all' })
    ).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(deps.listBoardTasks).not.toHaveBeenCalled();

    vi.mocked(deps.findOwnedProject).mockResolvedValue({ isArchived: true });
    await expect(
      service.list('user-1', { projectId: 99, status: 'all' })
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it('scopes moves to an active owned project', async () => {
    const deps = dependencies();
    const service = new TaskBoardService(deps);
    const input = {
      projectId: 7,
      boardStatus: 'in_progress' as const,
      tasks: [11],
    };

    await expect(service.move('user-1', input)).resolves.toEqual(
      expect.objectContaining({ boardStatus: 'in_progress' })
    );
    expect(deps.moveBoardTask).toHaveBeenCalledWith('user-1', input);
  });
});
