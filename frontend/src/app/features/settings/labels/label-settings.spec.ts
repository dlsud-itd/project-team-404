import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../shared/services/toast.service';
import { LABEL_REORDER_FAILED_MESSAGE, LabelSettings } from './label-settings';

const URL = `${environment.apiBaseUrl}/api/labels`;

const label = (id: number, name: string, sortOrder: number, taskCount: number | null = 0) => ({
  id,
  name,
  color: '#54A6A1',
  taskCount,
  sortOrder,
  isArchived: false,
  archivedAt: null,
});

const ACTIVE = [label(4, 'Planning', 0, 3), label(9, 'Errands', 1, 1), label(2, 'Reading', 2, 0)];
const ARCHIVED = [
  { ...label(7, 'Old stuff', 0, 2), isArchived: true, archivedAt: '2026-11-01T00:00:00.000Z' },
];

describe('LabelSettings', () => {
  let fixture: ComponentFixture<LabelSettings>;
  let http: HttpTestingController;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector<T>(selector);
  const all = <T extends HTMLElement>(selector: string) => [...page.querySelectorAll<T>(selector)];
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const activeNames = () =>
    all('ul[aria-label="Labels"] li.row .name').map((name) => name.textContent?.trim());
  const byLabel = (label: string) => el<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  const render = () => fixture.detectChanges();

  function type(selector: string, value: string): void {
    const input = el<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    render();
  }

  function submit(selector: string): void {
    el<HTMLFormElement>(`${selector}`)!
      .closest('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    render();
  }

  function flushLists(active = ACTIVE, archived = ARCHIVED): void {
    const requests = http.match((r) => r.url === URL && r.method === 'GET');
    expect(requests.map((r) => r.request.params.get('isArchived'))).toEqual(['false', 'true']);
    requests[0].flush(active);
    requests[1].flush(archived);
    render();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelSettings],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LabelSettings);
    page = fixture.nativeElement;
    render();
  });

  afterEach(() => http.verify());

  it('lists active labels with a color swatch, name, task count and drag handle', () => {
    expect(text('[role="status"]')).toBe('Loading labels…');
    flushLists();

    expect(activeNames()).toEqual(['Planning', 'Errands', 'Reading']);
    const first = el('ul[aria-label="Labels"] li.row')!;
    expect(first.querySelector<HTMLElement>('.swatch')!.style.backgroundColor).toBe(
      'rgb(84, 166, 161)',
    );
    expect(first.querySelector('.count')?.textContent).toBe('3 tasks');
    expect(all('ul[aria-label="Labels"] .count').map((c) => c.textContent)).toEqual([
      '3 tasks',
      '1 task',
      '0 tasks',
    ]);
    expect(first.querySelector('[cdkDragHandle], .handle')).toBeTruthy();
    expect(first.classList).toContain('cdk-drag');
  });

  it('keeps archived labels off this page and points to the Archive instead', () => {
    flushLists();
    expect(el('#archived-labels-heading')).toBeNull();
    expect(page.textContent).not.toContain('Old stuff');
    expect(el('.archive-note a')?.getAttribute('href')).toBe('/archive?tab=labels');
  });

  it('offers to try again when the labels fail to load', () => {
    // The first failure cancels the other list request.
    http.match((r) => r.url === URL)[0].flush(null, { status: 500, statusText: 'Server Error' });
    render();
    expect(text('[role="alert"]')).toContain("Couldn't load your labels.");

    el<HTMLButtonElement>('[role="alert"] button')!.click();
    render();
    flushLists();
    expect(activeNames()).toEqual(['Planning', 'Errands', 'Reading']);
  });

  it('checks for duplicate names as the user types, archived labels included', () => {
    flushLists();
    el<HTMLButtonElement>('button.action')!.click();
    render();
    const save = () => el<HTMLButtonElement>('[role="dialog"] button.save')!;
    expect(save().disabled).toBe(true);

    type('#new-label-name', ' planning ');
    expect(text('#new-label-status')).toBe('Label “planning” already exists.');
    expect(el('#new-label-name')!.getAttribute('aria-invalid')).toBe('true');
    expect(save().disabled).toBe(true);

    type('#new-label-name', 'Old Stuff');
    expect(text('#new-label-status')).toBe('Label “Old Stuff” already exists.');

    type('#new-label-name', 'Groceries');
    expect(text('#new-label-status')).toBe('');
    expect(save().disabled).toBe(false);
  });

  it('creates a label in the modal with the chosen color', () => {
    flushLists();
    el<HTMLButtonElement>('button.action')!.click();
    render();
    type('#new-label-name', '  Groceries ');
    const color = el<HTMLInputElement>('#new-label-color')!;
    color.value = '#c44536';
    color.dispatchEvent(new Event('input'));
    submit('#new-label-name');

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Groceries', color: '#C44536' });
    req.flush(label(12, 'Groceries', 3, 0), { status: 201, statusText: 'Created' });
    render();

    expect(activeNames()).toEqual(['Planning', 'Errands', 'Reading', 'Groceries']);
    expect(el('[role="dialog"]')).toBeNull();
  });

  it('shows the server’s duplicate-name error', () => {
    flushLists();
    el<HTMLButtonElement>('button.action')!.click();
    render();
    type('#new-label-name', 'Groceries');
    submit('#new-label-name');
    http
      .expectOne(URL)
      .flush({ error: 'taken', code: 'label-name-taken' }, { status: 409, statusText: 'Conflict' });
    render();
    expect(text('#new-label-status')).toBe('Label “Groceries” already exists.');
  });

  it('edits a label inline and cancels with Escape', () => {
    flushLists();
    byLabel('Edit Errands').click();
    render();

    const name = el<HTMLInputElement>('#label-9-editor-name')!;
    expect(name.value).toBe('Errands');
    name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    render();
    expect(el('#label-9-editor-name')).toBeNull();

    byLabel('Edit Errands').click();
    render();
    type('#label-9-editor-name', 'Reading');
    expect(text('#label-9-editor-status')).toBe('Label “Reading” already exists.');
    type('#label-9-editor-name', 'Chores');
    submit('#label-9-editor-name');

    const req = http.expectOne(`${URL}/9`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Chores', color: '#54A6A1' });
    req.flush({ id: 9, name: 'Chores', color: '#54A6A1' });
    render();

    expect(activeNames()).toEqual(['Planning', 'Chores', 'Reading']);
    // An older server's reply has no count; the one already shown stays.
    expect(all('ul[aria-label="Labels"] .count')[1].textContent).toBe('1 task');
  });

  it('reorders with Move up and Move down, saving the whole order', () => {
    flushLists();
    expect(byLabel('Move Planning up').disabled).toBe(true);
    expect(byLabel('Move Reading down').disabled).toBe(true);

    byLabel('Move Planning down').click();
    render();
    expect(activeNames()).toEqual(['Errands', 'Planning', 'Reading']);
    expect(text('[aria-live="polite"].visually-hidden')).toBe('Planning moved to position 2 of 3.');

    const req = http.expectOne(`${URL}/reorder`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ labelIds: [9, 4, 2] });
    req.flush({ labelIds: [9, 4, 2] });
    render();
    expect(activeNames()).toEqual(['Errands', 'Planning', 'Reading']);

    byLabel('Move Reading up').click();
    render();
    expect(activeNames()).toEqual(['Errands', 'Reading', 'Planning']);
    http.expectOne(`${URL}/reorder`).flush({ labelIds: [9, 2, 4] });
  });

  it('keeps focus on the move button, or its partner at the end of the list', async () => {
    flushLists();
    byLabel('Move Errands up').focus();
    byLabel('Move Errands up').click();
    render();
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Move Errands down');
    http.expectOne(`${URL}/reorder`).flush({ labelIds: [9, 4, 2] });
  });

  it('puts the order back with an error toast when saving it fails', () => {
    flushLists();
    byLabel('Move Planning down').click();
    render();
    expect(activeNames()).toEqual(['Errands', 'Planning', 'Reading']);

    http.expectOne(`${URL}/reorder`).flush(null, { status: 500, statusText: 'Server Error' });
    render();

    expect(activeNames()).toEqual(['Planning', 'Errands', 'Reading']);
    expect(TestBed.inject(ToastService).toasts()).toEqual([
      expect.objectContaining({ kind: 'error', message: LABEL_REORDER_FAILED_MESSAGE }),
    ]);
  });

  it('reorders by drag and drop', () => {
    flushLists();
    const component = fixture.componentInstance as unknown as {
      drop(event: { previousIndex: number; currentIndex: number }): void;
    };
    component.drop({ previousIndex: 2, currentIndex: 0 });
    render();
    expect(activeNames()).toEqual(['Reading', 'Planning', 'Errands']);
    expect(http.expectOne(`${URL}/reorder`).request.body).toEqual({ labelIds: [2, 4, 9] });

    // Dropping a label where it started saves nothing.
    component.drop({ previousIndex: 1, currentIndex: 1 });
    http.expectNone(`${URL}/reorder`);
  });

  it('archives and restores a label', () => {
    flushLists();
    byLabel('Archive Errands').click();
    const archive = http.expectOne(`${URL}/9/archive`);
    expect(archive.request.method).toBe('PUT');
    expect(archive.request.body).toEqual({ isArchived: true });
    archive.flush({ ...label(9, 'Errands', 1, 1), isArchived: true, archivedAt: 'now' });
    render();
    expect(activeNames()).toEqual(['Planning', 'Reading']);

    // The toast's Undo restores it.
    const toast = TestBed.inject(ToastService).toasts()[0];
    expect(toast.message).toBe('Label “Errands” archived');
    toast.action!.run();
    const restore = http.expectOne(`${URL}/9/archive`);
    expect(restore.request.body).toEqual({ isArchived: false });
    restore.flush(label(9, 'Errands', 1, 1));
    render();
    expect(activeNames()).toEqual(['Planning', 'Errands', 'Reading']);
  });

  it('shows a toast when archiving fails', () => {
    flushLists();
    byLabel('Archive Errands').click();
    http.expectOne(`${URL}/9/archive`).flush(null, { status: 500, statusText: 'x' });
    render();
    expect(activeNames()).toContain('Errands');
    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      "Couldn't archive label “Errands”. Please try again.",
    );
  });

  it('has no Delete buttons; labels are deleted for good from the Archive', () => {
    flushLists();
    expect(el('button[aria-label^="Delete"]')).toBeNull();
    expect(page.textContent).not.toContain('Delete');
  });
});
