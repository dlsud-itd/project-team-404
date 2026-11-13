import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      providers: [provideHttpClient(), provideHttpClientTesting()],
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

  it('shows archived labels separately, each with a Restore action', () => {
    flushLists();
    expect(text('#archived-labels-heading')).toBe('Archived');
    expect(all('ul.archived .name').map((n) => n.textContent)).toEqual(['Old stuff']);
    expect(byLabel('Restore Old stuff')).toBeTruthy();
    expect(el('ul.archived button[aria-label^="Move"]')).toBeNull();
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
    const save = () => el<HTMLButtonElement>('section.create button.save')!;
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

  it('creates a label inline with the chosen color', () => {
    flushLists();
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
    expect(el<HTMLInputElement>('#new-label-name')!.value).toBe('');
  });

  it('shows the server’s duplicate-name error', () => {
    flushLists();
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
    expect(all('ul.archived .name').map((n) => n.textContent)).toEqual(['Old stuff', 'Errands']);

    byLabel('Restore Old stuff').click();
    const restore = http.expectOne(`${URL}/7/archive`);
    expect(restore.request.body).toEqual({ isArchived: false });
    restore.flush(label(7, 'Old stuff', 2, 2));
    render();
    expect(activeNames()).toEqual(['Planning', 'Reading', 'Old stuff']);
  });

  it('shows a toast when archiving fails', () => {
    flushLists();
    byLabel('Archive Errands').click();
    http.expectOne(`${URL}/9/archive`).flush(null, { status: 500, statusText: 'x' });
    render();
    expect(activeNames()).toContain('Errands');
    expect(TestBed.inject(ToastService).toasts()[0].message).toBe(
      "Couldn't archive “Errands”. Please try again.",
    );
  });

  it('confirms a delete, saying how many tasks lose the label', () => {
    flushLists();
    byLabel('Delete Planning').click();
    render();

    const dialog = el('[role="alertdialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(text('#delete-label-title')).toBe('Delete “Planning”?');
    expect(text('#delete-label-impact')).toBe(
      "3 tasks will lose this label. This can't be undone.",
    );

    dialog.querySelector<HTMLButtonElement>('#delete-label-cancel')!.click();
    render();
    expect(el('[role="alertdialog"]')).toBeNull();
    http.expectNone(`${URL}/4`);

    byLabel('Delete Planning').click();
    render();
    [...page.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')]
      .find((b) => b.textContent?.trim() === 'Delete label')!
      .click();
    const req = http.expectOne(`${URL}/4`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    render();

    expect(activeNames()).toEqual(['Errands', 'Reading']);
    expect(el('[role="alertdialog"]')).toBeNull();
  });

  it('words the delete warning for one task, none, or an unknown count', () => {
    flushLists([label(1, 'One', 0, 1), label(2, 'None', 1, 0), label(3, 'Unknown', 2, null)], []);
    const impact = (name: string) => {
      byLabel(`Delete ${name}`).click();
      render();
      const message = text('#delete-label-impact');
      el<HTMLButtonElement>('#delete-label-cancel')!.click();
      render();
      return message;
    };
    expect(impact('One')).toBe("1 task will lose this label. This can't be undone.");
    expect(impact('None')).toBe("No tasks use this label. This can't be undone.");
    expect(impact('Unknown')).toBe(
      "Any tasks that use it will lose this label. This can't be undone.",
    );
  });

  it('keeps the dialog open with an error when the delete fails', () => {
    flushLists();
    byLabel('Delete Reading').click();
    render();
    [...page.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')]
      .find((b) => b.textContent?.trim() === 'Delete label')!
      .click();
    http.expectOne(`${URL}/2`).flush(null, { status: 500, statusText: 'x' });
    render();
    expect(text('.dialog-error')).toBe("Couldn't delete the label. Please try again.");
    expect(activeNames()).toContain('Reading');
  });
});
