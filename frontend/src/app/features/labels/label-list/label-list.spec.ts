import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { LabelsStore } from '../state/labels.store';
import { ERRANDS, STUDY, URGENT, apiLabel } from '../testing/helpers/api-label';
import { LabelList } from './label-list';

@Component({ template: '' })
class Blank {}

const URL = `${environment.apiBaseUrl}/api/labels`;

describe('LabelList', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const all = (selector: string) => Array.from(page().querySelectorAll(selector));
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const names = () => all('.row .name').map((e) => e.textContent);
  const dialog = () => document.querySelector('[role="alertdialog"]');

  async function open(labels = [STUDY, ERRANDS, URGENT]): Promise<void> {
    await harness.navigateByUrl('/labels');
    http.expectOne(URL).flush(labels.map(apiLabel));
    harness.detectChanges();
  }

  function askDelete(name: string): void {
    el<HTMLButtonElement>(`button[aria-label="Delete ${name}"]`).click();
    harness.detectChanges();
  }

  function confirm(): void {
    el<HTMLButtonElement>('.dialog .confirm').click();
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'labels', component: LabelList },
          { path: 'labels/new', component: Blank },
          { path: 'labels/:labelId/edit', component: Blank },
          { path: 'home', component: Blank },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  it('shows a loading message until the labels arrive', async () => {
    await harness.navigateByUrl('/labels');

    expect(text('[role="status"]')).toBe('Loading labels…');
    http.expectOne(URL).flush([]);
  });

  it('lists the labels alphabetically with edit and delete actions', async () => {
    await open();

    expect(text('h1')).toBe('Labels');
    expect(names()).toEqual(['errands', 'Study', 'Urgent']);
    expect(el('a[aria-label="Edit Study"]').getAttribute('href')).toBe('/labels/3/edit');
    expect(el('button[aria-label="Delete Study"]')).toBeTruthy();
    expect(el('a.new').getAttribute('href')).toBe('/labels/new');
  });

  it('invites the user to add a first label when there are none', async () => {
    await open([]);

    expect(text('.empty-title')).toBe('No labels yet.');
    expect(el('.empty a').getAttribute('href')).toBe('/labels/new');
  });

  it('shows a load failure with a working retry', async () => {
    await harness.navigateByUrl('/labels');
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });
    harness.detectChanges();

    expect(text('.load-error p')).toBe(
      "Couldn't load your labels. Something went wrong. Please try again.",
    );

    el<HTMLButtonElement>('.retry').click();
    harness.detectChanges();
    expect(text('[role="status"]')).toBe('Loading labels…');

    http.expectOne(URL).flush([apiLabel(STUDY)]);
    harness.detectChanges();

    expect(el('.load-error')).toBeNull();
    expect(names()).toEqual(['Study']);
  });

  describe('deleting', () => {
    it('asks before deleting', async () => {
      await open();
      askDelete('Study');

      expect(dialog()?.querySelector('h2')?.textContent).toBe('Delete “Study”?');
      expect(dialog()?.textContent).toContain('removed from every task');
      http.expectNone(`${URL}/3`);
    });

    it('closes the dialog without deleting on Cancel', async () => {
      await open();
      askDelete('Study');

      el<HTMLButtonElement>('.dialog .cancel').click();
      harness.detectChanges();

      expect(dialog()).toBeNull();
      expect(names()).toContain('Study');
    });

    it('closes the dialog on Escape', async () => {
      await open();
      askDelete('Study');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      harness.detectChanges();

      expect(dialog()).toBeNull();
    });

    it('deletes the label, removes it from the list and confirms', async () => {
      await open();
      askDelete('Study');
      confirm();

      expect(text('.dialog .confirm')).toBe('Deleting…');
      const req = http.expectOne(`${URL}/3`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      harness.detectChanges();

      expect(dialog()).toBeNull();
      expect(names()).toEqual(['errands', 'Urgent']);
      expect(text('.form-notice')).toBe('“Study” was deleted.');
    });

    it('keeps the dialog open with the error when the delete fails', async () => {
      await open();
      askDelete('Study');
      confirm();
      http.expectOne(`${URL}/3`).flush(null, { status: 500, statusText: 'Error' });
      harness.detectChanges();

      expect(dialog()?.querySelector('.error')?.textContent).toBe(
        'Something went wrong. Please try again.',
      );
      expect(names()).toContain('Study');
      expect(text('.dialog .confirm')).toBe('Delete label');
    });

    it('closes and reloads when the label is already gone', async () => {
      await open();
      askDelete('Study');
      confirm();
      http.expectOne(`${URL}/3`).flush(
        { error: 'Label not found' },
        {
          status: 404,
          statusText: 'Not Found',
        },
      );
      harness.detectChanges();

      expect(dialog()).toBeNull();
      expect(text('.banner-error')).toBe('Label not found.');
      http.expectOne(URL).flush([apiLabel(ERRANDS)]);
      harness.detectChanges();
      expect(names()).toEqual(['errands']);
    });
  });

  it('reuses labels already in the store while reloading', async () => {
    TestBed.inject(LabelsStore).setLabels([STUDY]);
    await harness.navigateByUrl('/labels');

    expect(names()).toEqual(['Study']);
    expect(el('[role="status"]')).toBeNull();
    http.expectOne(URL).flush([apiLabel(STUDY)]);
  });

  it('links back to the dashboard', async () => {
    await open();
    el<HTMLAnchorElement>('a.back').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/home');
  });
});
