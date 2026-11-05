import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { LabelsStore } from '../state/labels.store';
import { ERRANDS, STUDY, apiLabel } from '../testing/helpers/api-label';
import type { Label } from '../types/label.types';
import { LabelForm } from './label-form';

@Component({ template: '' })
class Blank {}

const URL = `${environment.apiBaseUrl}/api/labels`;

describe('LabelForm', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const nameMessage = () => text('#label-name-status');
  const saveButton = () => el<HTMLButtonElement>('button[type="submit"]');

  function type(value: string): void {
    const input = el<HTMLInputElement>('#label-name');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    harness.detectChanges();
  }

  function submit(): void {
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    harness.detectChanges();
  }

  function pickColor(value: string): void {
    el<HTMLInputElement>(`input[data-color="${value}"]`).click();
    harness.detectChanges();
  }

  /** Answers the label-list request the form makes for its duplicate-name check. */
  function flushList(labels: Label[] = [STUDY, ERRANDS]): void {
    http.expectOne({ method: 'GET', url: URL }).flush(labels.map(apiLabel));
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'labels', component: Blank },
          { path: 'labels/new', component: LabelForm, data: { mode: 'create' } },
          { path: 'labels/:labelId/edit', component: LabelForm, data: { mode: 'edit' } },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  describe('create mode', () => {
    beforeEach(async () => {
      await harness.navigateByUrl('/labels/new');
      flushList();
    });

    it('shows a labelled name field, a color picker, a preview and a submit button', () => {
      expect(text('h1')).toBe('New label');
      expect(el('label[for="label-name"]')).toBeTruthy();
      // "No color" plus the nine preset colors.
      expect(page().querySelectorAll('input[type="radio"]')).toHaveLength(10);
      expect(text('app-label-chip .name')).toBe('Label');
      expect(saveButton().textContent).toContain('Create label');
    });

    it('requires a name and makes no request when submitted empty', () => {
      submit();

      expect(nameMessage()).toBe('Label name is required.');
      http.expectNone({ method: 'POST', url: URL });
    });

    it('shows a length error while typing and blocks the submit', () => {
      type('a'.repeat(51));

      expect(nameMessage()).toBe('Use 50 characters or fewer.');
      expect(text('.count')).toBe('51/50');

      submit();
      http.expectNone({ method: 'POST', url: URL });
    });

    it('warns about a name the user already has before sending anything', () => {
      type('Study');

      expect(nameMessage()).toBe('You already have a label with this name.');
      submit();
      http.expectNone({ method: 'POST', url: URL });
    });

    it('previews the label as it is typed', () => {
      type('Reading');
      pickColor('#16A34A');

      expect(text('app-label-chip .name')).toBe('Reading');
      expect(el<HTMLElement>('app-label-chip .dot').style.background).toBe('rgb(22, 163, 74)');
    });

    it('sends a trimmed name with no color as null, then returns to the list', async () => {
      type('  Reading  ');
      submit();

      const req = http.expectOne({ method: 'POST', url: URL });
      expect(req.request.body).toEqual({ name: 'Reading', color: null });
      req.flush(apiLabel({ labelId: 11, name: 'Reading', color: null }));
      await harness.fixture.whenStable();

      expect(router.url).toBe('/labels');
      expect(TestBed.inject(LabelsStore).byId(11)?.name).toBe('Reading');
    });

    it('sends the chosen color', () => {
      type('Reading');
      pickColor('#2563EB');
      submit();

      expect(http.expectOne({ method: 'POST', url: URL }).request.body).toEqual({
        name: 'Reading',
        color: '#2563EB',
      });
    });

    it('disables the button while saving and ignores a second submit', () => {
      type('Reading');
      submit();
      submit();

      expect(saveButton().disabled).toBe(true);
      expect(saveButton().textContent).toContain('Creating…');
      http.expectOne({ method: 'POST', url: URL }).flush(apiLabel(STUDY));
    });

    it('shows a 409 on the name field and clears it on typing', () => {
      type('Reading');
      submit();
      http
        .expectOne({ method: 'POST', url: URL })
        .flush(
          { code: 'label-name-taken', error: 'taken' },
          { status: 409, statusText: 'Conflict' },
        );
      harness.detectChanges();

      expect(nameMessage()).toBe('You already have a label with this name.');
      expect(el<HTMLInputElement>('#label-name').value).toBe('Reading');

      type('Reading 2');
      expect(nameMessage()).toBe('');
    });

    it('shows a generic error on a server failure so the user can retry', () => {
      type('Reading');
      submit();
      http
        .expectOne({ method: 'POST', url: URL })
        .flush(null, { status: 500, statusText: 'Error' });
      harness.detectChanges();

      expect(text('.form-error')).toBe('Something went wrong. Please try again.');

      submit();
      http.expectOne({ method: 'POST', url: URL }).flush(apiLabel(STUDY));
    });

    it('closes with Escape without saving', async () => {
      type('Reading');
      el('form').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await harness.fixture.whenStable();

      expect(router.url).toBe('/labels');
    });
  });

  it('does not reload the labels when the store already has them', async () => {
    TestBed.inject(LabelsStore).setLabels([STUDY]);
    await harness.navigateByUrl('/labels/new');

    type('Study');
    expect(nameMessage()).toBe('You already have a label with this name.');
    http.expectNone({ method: 'GET', url: URL });
  });

  it('still works when the duplicate check cannot load the labels', async () => {
    await harness.navigateByUrl('/labels/new');
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });
    harness.detectChanges();

    expect(el('form')).toBeTruthy();
    type('Study');
    submit();
    http.expectOne({ method: 'POST', url: URL }).flush(apiLabel(STUDY));
  });

  describe('edit mode', () => {
    async function open(label: Label = STUDY): Promise<void> {
      await harness.navigateByUrl(`/labels/${label.labelId}/edit`);
      expect(text('[role="status"]')).toBe('Loading label…');
      flushList();
      http.expectOne(`${URL}/${label.labelId}`).flush(apiLabel(label));
      harness.detectChanges();
    }

    it('fills the form with the current values', async () => {
      await open();

      expect(text('h1')).toBe('Edit label');
      expect(el<HTMLInputElement>('#label-name').value).toBe('Study');
      expect(el<HTMLInputElement>('input[data-color="#2563EB"]').checked).toBe(true);
    });

    it('keeps Save off until something changes', async () => {
      await open();
      expect(saveButton().disabled).toBe(true);

      type('Reading');
      expect(saveButton().disabled).toBe(false);

      type('Study');
      expect(saveButton().disabled).toBe(true);
    });

    it('lets the label keep its own name but not take another label’s', async () => {
      await open();

      type('Study');
      expect(nameMessage()).toBe('');

      type('errands');
      expect(nameMessage()).toBe('You already have a label with this name.');
    });

    it('sends only the changed fields, then returns to the list', async () => {
      await open();
      pickColor('');
      submit();

      const req = http.expectOne(`${URL}/3`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ color: null });
      req.flush(apiLabel({ ...STUDY, color: null }));
      await harness.fixture.whenStable();

      expect(router.url).toBe('/labels');
      expect(TestBed.inject(LabelsStore).byId(3)?.color).toBeNull();
    });

    it('shows "Label not found" and refreshes the list when the save returns 404', async () => {
      await open();
      type('Reading');
      submit();
      http.expectOne(`${URL}/3`).flush(
        { error: 'Label not found' },
        {
          status: 404,
          statusText: 'Not Found',
        },
      );
      harness.detectChanges();

      expect(text('.form-error')).toBe('Label not found.');
      http.expectOne(URL).flush([]);
    });

    it('shows "Label not found" when the label cannot be loaded', async () => {
      await harness.navigateByUrl('/labels/99/edit');
      flushList();
      http.expectOne(`${URL}/99`).flush(
        { error: 'Label not found' },
        {
          status: 404,
          statusText: 'Not Found',
        },
      );
      harness.detectChanges();

      expect(text('.message p')).toBe('Label not found.');
      expect(el('form')).toBeNull();
    });

    it('treats a non-numeric id as not found without loading it', async () => {
      await harness.navigateByUrl('/labels/abc/edit');
      flushList();

      expect(text('.message p')).toBe('Label not found.');
    });

    it('offers a retry when loading fails', async () => {
      await harness.navigateByUrl('/labels/3/edit');
      flushList();
      http.expectOne(`${URL}/3`).flush(null, { status: 500, statusText: 'Error' });
      harness.detectChanges();

      el<HTMLButtonElement>('.message button').click();
      http.expectOne(`${URL}/3`).flush(apiLabel(STUDY));
      harness.detectChanges();

      expect(el<HTMLInputElement>('#label-name').value).toBe('Study');
    });
  });
});
