import { TestBed } from '@angular/core/testing';
import { TOAST_DURATION_MS, ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it('shows info and error toasts that close on their own', () => {
    service.info('Saved');
    service.error('Failed');
    expect(service.toasts().map((t) => [t.kind, t.message])).toEqual([
      ['info', 'Saved'],
      ['error', 'Failed'],
    ]);

    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(service.toasts()).toEqual([]);
  });

  it('has neutral and danger kinds for edits and deliberate deletes', () => {
    service.neutral('Changes saved');
    service.danger('Deleted');
    expect(service.toasts().map((t) => [t.kind, t.message])).toEqual([
      ['neutral', 'Changes saved'],
      ['danger', 'Deleted'],
    ]);
  });

  it('keeps a toast up for its own duration', () => {
    service.show('Archived', { durationMs: 5000 });
    vi.advanceTimersByTime(4999);
    expect(service.toasts().length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toEqual([]);
  });

  it('runs a toast action once and closes the toast', () => {
    const run = vi.fn();
    const id = service.show('Archived', { action: { label: 'Undo', run } });

    service.runAction(id);
    service.runAction(id);

    expect(run).toHaveBeenCalledTimes(1);
    expect(service.toasts()).toEqual([]);
  });
});
