import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/services/toast.service';
import { UNDO_DURATION_MS } from '../../services/archive-undo.service';
import { ArchiveAction } from './archive-action';

const API = `${environment.apiBaseUrl}/api`;

describe('ArchiveAction', () => {
  let fixture: ComponentFixture<ArchiveAction>;
  let http: HttpTestingController;
  let toasts: ToastService;
  let log: string[];

  const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;

  function render(inputs: Record<string, unknown> = {}): void {
    fixture.componentRef.setInput('kind', 'task');
    fixture.componentRef.setInput('itemId', 9);
    fixture.componentRef.setInput('name', 'Buy milk');
    fixture.componentRef.setInput('hooks', {
      apply: () => log.push('apply'),
      rollback: () => log.push('rollback'),
    });
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArchiveAction],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ArchiveAction);
    log = [];
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('reads "Archive" with a full accessible name', () => {
    render();
    expect(button()?.textContent?.trim()).toBe('Archive');
    expect(button()?.getAttribute('aria-label')).toBe('Archive task Buy milk');
    expect(button()?.getAttribute('role')).toBeNull();
  });

  it('reads "Restore" for an archived item and works as a menu item', () => {
    render({ archived: true, variant: 'menuitem' });
    expect(button()?.textContent?.trim()).toBe('Restore');
    expect(button()?.getAttribute('role')).toBe('menuitem');
  });

  it('renders nothing when hidden, e.g. for the Inbox', () => {
    render({ kind: 'project', hidden: true });
    expect(button()).toBeNull();
  });

  it('archives at once, then offers Undo for five seconds', () => {
    vi.useFakeTimers();
    const changed: boolean[] = [];
    fixture.componentInstance.changed.subscribe((value) => changed.push(value));
    render();

    button()!.click();
    expect(log).toEqual(['apply']);
    expect(changed).toEqual([true]);

    const req = http.expectOne(`${API}/tasks/9/archive`);
    expect(req.request.body).toEqual({ isArchived: true });
    req.flush({ taskId: 9, isArchived: true, archivedAt: '2026-11-21T00:00:00.000Z' });

    const toast = toasts.toasts().at(-1)!;
    expect(toast.message).toBe('Task “Buy milk” archived');
    expect(toast.action?.label).toBe('Undo');

    vi.advanceTimersByTime(UNDO_DURATION_MS);
    expect(toasts.toasts()).toEqual([]);
  });

  it('puts the item back when Undo is pressed', () => {
    render();
    button()!.click();
    http
      .expectOne(`${API}/tasks/9/archive`)
      .flush({ taskId: 9, isArchived: true, archivedAt: '2026-11-21T00:00:00.000Z' });

    toasts.runAction(toasts.toasts().at(-1)!.id);
    expect(log).toEqual(['apply', 'rollback']);

    const req = http.expectOne(`${API}/tasks/9/archive`);
    expect(req.request.body).toEqual({ isArchived: false });
    req.flush({ taskId: 9, isArchived: false, archivedAt: null });
    expect(toasts.toasts()).toEqual([]);
  });

  it('rolls back and shows an error toast when archiving fails', () => {
    render();
    button()!.click();
    http
      .expectOne(`${API}/tasks/9/archive`)
      .flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(log).toEqual(['apply', 'rollback']);
    const toast = toasts.toasts().at(-1)!;
    expect(toast.kind).toBe('error');
    expect(toast.message).toBe("Couldn't archive task “Buy milk”. Please try again.");
    expect(toast.action).toBeUndefined();
  });

  it('restores with a confirmation toast', () => {
    render({ archived: true });
    button()!.click();
    http
      .expectOne(`${API}/tasks/9/archive`)
      .flush({ taskId: 9, isArchived: false, archivedAt: null });

    expect(log).toEqual(['apply']);
    expect(toasts.toasts().at(-1)?.message).toBe('Task “Buy milk” restored');
  });

  it('builds the hooks from a function for list rows', () => {
    const ids: number[] = [];
    render();
    fixture.componentRef.setInput('hooks', (id: number) => {
      ids.push(id);
      return {};
    });
    fixture.detectChanges();

    button()!.click();
    http
      .expectOne(`${API}/tasks/9/archive`)
      .flush({ taskId: 9, isArchived: true, archivedAt: '2026-11-21T00:00:00.000Z' });
    expect(ids).toEqual([9]);
  });
});
