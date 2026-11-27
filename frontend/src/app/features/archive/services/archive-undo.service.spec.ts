import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import { PROJECT_LIMIT_MESSAGE } from '../../projects/project-crud/mappers/project-error.mapper';
import { ArchiveService } from './archive.service';
import { ArchiveUndoService } from './archive-undo.service';

describe('ArchiveUndoService restore', () => {
  const target = { kind: 'project', id: 7, name: 'Thesis' } as const;
  let restore: ReturnType<typeof vi.fn>;

  const toastList = () =>
    TestBed.inject(ToastService)
      .toasts()
      .map((t) => [t.kind, t.message]);

  beforeEach(() => {
    restore = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: ArchiveService, useValue: { restore } }],
    });
  });

  it('explains the project limit when the server refuses a restore', () => {
    restore.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { error: 'limit', code: 'project-limit-reached' },
          }),
      ),
    );
    const rollback = vi.fn();

    TestBed.inject(ArchiveUndoService).restore(target, { rollback });

    expect(rollback).toHaveBeenCalledOnce();
    expect(toastList()).toEqual([['error', PROJECT_LIMIT_MESSAGE]]);
  });

  it('keeps the generic message for other failures', () => {
    restore.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    TestBed.inject(ArchiveUndoService).restore(target);

    const [[kind, message]] = toastList();
    expect(kind).toBe('error');
    expect(message).not.toBe(PROJECT_LIMIT_MESSAGE);
  });
});
