import { describe, expect, it, vi } from 'vitest';
import { TaskNotFoundError } from '../task-crud/errors/task-not-found.error';
import { TaskReorderConflictError } from '../task-organization/errors/task-reorder-conflict.error';
import { createTaskBoardController } from './task-board.controller';

function response(validated?: unknown) {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    locals: { validated },
  };
  return res;
}

describe('TaskBoardController', () => {
  it('returns the board result', async () => {
    const result = {
      projectId: 7,
      columns: { todo: [], inProgress: [], done: [] },
      counts: { todo: 0, inProgress: 0, done: 0 },
    };
    const service = { list: vi.fn().mockResolvedValue(result), move: vi.fn() };
    const controller = createTaskBoardController(service as never);
    const query = { projectId: 7, status: 'all' };
    const res = response(query);
    const next = vi.fn();

    await controller.list(
      { auth: { userId: 'user-1' } } as never,
      res as never,
      next
    );

    expect(service.list).toHaveBeenCalledWith('user-1', query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns the reordered board column', async () => {
    const result = {
      projectId: 7,
      boardStatus: 'in_progress',
      tasks: [11],
    };
    const input = {
      projectId: 7,
      boardStatus: 'in_progress',
      tasks: [11],
    };
    const service = { list: vi.fn(), move: vi.fn().mockResolvedValue(result) };
    const controller = createTaskBoardController(service as never);
    const res = response(input);
    const next = vi.fn();

    await controller.reorder(
      { auth: { userId: 'user-1' } } as never,
      res as never,
      next
    );

    expect(service.move).toHaveBeenCalledWith('user-1', input);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(next).not.toHaveBeenCalled();
  });

  it('maps missing projects and stale orders to API errors', async () => {
    const service = {
      list: vi
        .fn()
        .mockRejectedValue(new TaskNotFoundError('Project not found')),
      move: vi.fn().mockRejectedValue(new TaskReorderConflictError()),
    };
    const controller = createTaskBoardController(service as never);
    const next = vi.fn();
    const listResponse = response();
    const moveResponse = response();

    await controller.list(
      { auth: { userId: 'user-1' } } as never,
      listResponse as never,
      next
    );
    await controller.reorder(
      { auth: { userId: 'user-1' } } as never,
      moveResponse as never,
      next
    );

    expect(listResponse.status).toHaveBeenCalledWith(404);
    expect(moveResponse.status).toHaveBeenCalledWith(409);
    expect(next).not.toHaveBeenCalled();
  });
});
