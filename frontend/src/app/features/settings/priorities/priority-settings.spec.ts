import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../shared/services/toast.service';
import { PrioritiesStore, REORDER_FAILED_MESSAGE } from '../state/priorities.store';
import { PrioritySettings } from './priority-settings';

const URL = `${environment.apiBaseUrl}/api/priorities`;

const LEVELS = [
  { id: 11, name: 'Low', color: '#6E9F79', sortOrder: 0, isDefault: false, taskCount: 2 },
  { id: 12, name: 'Medium', color: '#D59B38', sortOrder: 1, isDefault: true, taskCount: 5 },
  { id: 13, name: 'High', color: '#D84A4A', sortOrder: 2, isDefault: false, taskCount: 1 },
];

describe('PrioritySettings', () => {
  let fixture: ComponentFixture<PrioritySettings>;
  let http: HttpTestingController;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector<T>(selector);
  const all = <T extends HTMLElement>(selector: string) => [...page.querySelectorAll<T>(selector)];
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const names = () => all('ul[aria-label="Priority levels"] .name').map((n) => n.textContent);
  const byLabel = (label: string) => el<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  const render = () => fixture.detectChanges();

  function type(selector: string, value: string): void {
    const input = el<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    render();
  }

  function submit(selector: string): void {
    el(selector)!
      .closest('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    render();
  }

  function open(levels: object[] = LEVELS): void {
    fixture = TestBed.createComponent(PrioritySettings);
    page = fixture.nativeElement;
    render();
    http.expectOne(URL).flush(levels);
    render();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrioritySettings],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the levels in order with color, name, task count and a Default badge', () => {
    open();

    expect(names()).toEqual(['Low', 'Medium', 'High']);
    const rows = all('ul[aria-label="Priority levels"] li.row');
    expect(rows[0].querySelector<HTMLElement>('.swatch')!.style.backgroundColor).toBe(
      'rgb(110, 159, 121)',
    );
    expect(rows.map((row) => row.querySelector('.count')?.textContent)).toEqual([
      '2 tasks',
      '5 tasks',
      '1 task',
    ]);
    expect(rows.map((row) => row.querySelector('.badge')?.textContent ?? null)).toEqual([
      null,
      'Default',
      null,
    ]);
    expect(rows[0].querySelector('.handle')).toBeTruthy();
    // The default level has no Set as default action.
    expect(el('button[aria-label="Set Medium as default"]')).toBeNull();
  });

  it('shows the built-in levels read-only, with a retry, when loading fails', () => {
    fixture = TestBed.createComponent(PrioritySettings);
    page = fixture.nativeElement;
    render();
    expect(text('[role="status"]')).toBe('Loading priorities…');
    http.expectOne(URL).flush(null, { status: 404, statusText: 'Not Found' });
    render();

    expect(text('[role="alert"]')).toContain("Couldn't load your priority levels.");
    expect(names()).toEqual(['High', 'Medium', 'Low']);
    expect(el('section.create')).toBeNull();
    expect(el('button[aria-label^="Move"]')).toBeNull();
    expect(el('button[aria-label^="Delete"]')).toBeNull();

    el<HTMLButtonElement>('[role="alert"] button')!.click();
    http.expectOne(URL).flush(LEVELS);
    render();
    expect(el('[role="alert"]')).toBeNull();
    expect(names()).toEqual(['Low', 'Medium', 'High']);
  });

  it('creates a level, checking duplicate names live', () => {
    open();
    type('#new-priority-name', 'high');
    expect(text('#new-priority-status')).toBe('Priority “high” already exists.');

    type('#new-priority-name', 'Urgent');
    submit('#new-priority-name');
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Urgent', color: '#7B23A8' });
    req.flush(
      { id: 14, name: 'Urgent', color: '#7B23A8', sortOrder: 3, isDefault: false, taskCount: 0 },
      { status: 201, statusText: 'Created' },
    );
    render();

    expect(names()).toEqual(['Low', 'Medium', 'High', 'Urgent']);
    expect(el<HTMLInputElement>('#new-priority-name')!.value).toBe('');
  });

  it('edits a level inline', () => {
    open();
    byLabel('Edit High').click();
    render();
    expect(el<HTMLInputElement>('#priority-13-editor-name')!.value).toBe('High');

    type('#priority-13-editor-name', 'Critical');
    submit('#priority-13-editor-name');
    const req = http.expectOne(`${URL}/13`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Critical', color: '#D84A4A' });
    req.flush({ ...LEVELS[2], name: 'Critical' });
    render();

    expect(names()).toEqual(['Low', 'Medium', 'Critical']);
    expect(el('#priority-13-editor-name')).toBeNull();
  });

  it('sets a level as the default', () => {
    open();
    byLabel('Set High as default').click();
    const req = http.expectOne(`${URL}/13/default`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 13, isDefault: true });
    render();

    const badges = all('ul[aria-label="Priority levels"] li.row').map(
      (row) => row.querySelector('.badge')?.textContent ?? null,
    );
    expect(badges).toEqual([null, null, 'Default']);
    expect(byLabel('Set Medium as default')).toBeTruthy();
  });

  it('reorders with the keyboard buttons and keeps the new order everywhere', () => {
    open();
    expect(byLabel('Move Low up').disabled).toBe(true);

    byLabel('Move High up').click();
    render();
    expect(names()).toEqual(['Low', 'High', 'Medium']);
    expect(
      TestBed.inject(PrioritiesStore)
        .levels()
        .map((l) => l.name),
    ).toEqual(['Low', 'High', 'Medium']);
    expect(text('[aria-live="polite"].visually-hidden')).toBe('High moved to position 2 of 3.');

    const req = http.expectOne(`${URL}/reorder`);
    expect(req.request.body).toEqual({ priorityIds: [11, 13, 12] });
    req.flush({ priorityIds: [11, 13, 12] });
  });

  it('rolls the order back with an error toast when saving it fails', () => {
    open();
    byLabel('Move Low down').click();
    render();
    expect(names()).toEqual(['Medium', 'Low', 'High']);

    http.expectOne(`${URL}/reorder`).flush(null, { status: 500, statusText: 'Server Error' });
    render();
    expect(names()).toEqual(['Low', 'Medium', 'High']);
    expect(TestBed.inject(ToastService).toasts()).toEqual([
      expect.objectContaining({ kind: 'error', message: REORDER_FAILED_MESSAGE }),
    ]);
  });

  it('reorders by drag and drop', () => {
    open();
    (
      fixture.componentInstance as unknown as {
        drop(event: { previousIndex: number; currentIndex: number }): void;
      }
    ).drop({ previousIndex: 0, currentIndex: 2 });
    render();
    expect(names()).toEqual(['Medium', 'High', 'Low']);
    http.expectOne(`${URL}/reorder`).flush({ priorityIds: [12, 13, 11] });
  });

  it('deletes a level after choosing where its tasks go', () => {
    open();
    byLabel('Delete Medium').click();
    render();
    expect(el('app-delete-priority-dialog')).toBeTruthy();

    const select = el<HTMLSelectElement>('#reassign-priority')!;
    select.value = '13';
    select.dispatchEvent(new Event('change'));
    render();
    [...page.querySelectorAll<HTMLButtonElement>('app-delete-priority-dialog button')]
      .find((b) => b.textContent?.trim() === 'Delete level')!
      .click();
    render();

    const req = http.expectOne((r) => r.url === `${URL}/12`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('reassignTo')).toBe('13');
    req.flush({ deletedId: 12, reassignedTo: 13, tasksReassigned: 5 });
    render();

    expect(el('app-delete-priority-dialog')).toBeNull();
    expect(names()).toEqual(['Low', 'High']);
    const high = all('ul[aria-label="Priority levels"] li.row')[1];
    expect(high.querySelector('.badge')?.textContent).toBe('Default');
    expect(high.querySelector('.count')?.textContent).toBe('6 tasks');
  });

  it('shows the server’s reason when it refuses a delete', () => {
    open();
    byLabel('Delete Low').click();
    render();
    const select = el<HTMLSelectElement>('#reassign-priority')!;
    select.value = '12';
    select.dispatchEvent(new Event('change'));
    render();
    [...page.querySelectorAll<HTMLButtonElement>('app-delete-priority-dialog button')]
      .find((b) => b.textContent?.trim() === 'Delete level')!
      .click();
    http
      .expectOne((r) => r.url === `${URL}/11`)
      .flush(
        { error: 'Priority is still in use', code: 'PriorityInUse' },
        { status: 409, statusText: 'Conflict' },
      );
    render();
    expect(text('app-delete-priority-dialog [role="alert"]')).toBe('Priority is still in use');
    expect(names()).toEqual(['Low', 'Medium', 'High']);
  });

  it('does not let the last level be deleted', () => {
    open([{ ...LEVELS[1] }]);
    const remove = byLabel('Delete Medium');
    expect(remove.disabled).toBe(true);
    expect(remove.title).toBe('You need at least one priority level');
  });
});
