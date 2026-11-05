import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { LabelsStore } from '../state/labels.store';
import { ERRANDS, STUDY, apiLabel } from '../testing/helpers/api-label';
import type { Label } from '../types/label.types';
import { LabelService } from './label.service';

const URL = `${environment.apiBaseUrl}/api/labels`;

describe('LabelService', () => {
  let service: LabelService;
  let store: LabelsStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LabelService);
    store = TestBed.inject(LabelsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list', () => {
    it('GETs /api/labels and maps each label', () => {
      let result: Label[] | undefined;
      service.list().subscribe((labels) => (result = labels));

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('GET');
      req.flush([apiLabel(STUDY), apiLabel(ERRANDS)]);

      expect(result).toEqual([STUDY, ERRANDS]);
    });
  });

  describe('refresh', () => {
    it('loads the labels into the store', () => {
      service.refresh().subscribe();
      expect(store.loading()).toBe(true);

      http.expectOne(URL).flush([apiLabel(STUDY)]);

      expect(store.labels()).toEqual([STUDY]);
      expect(store.loaded()).toBe(true);
      expect(store.loading()).toBe(false);
    });

    it('records a failure in the store and passes the error on', () => {
      let failed = false;
      service.refresh().subscribe({ error: () => (failed = true) });

      http.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });

      expect(failed).toBe(true);
      expect(store.error()).toBe('Something went wrong. Please try again.');
      expect(store.loaded()).toBe(false);
    });
  });

  describe('get', () => {
    it('GETs one label and puts it in the store', () => {
      let result: Label | undefined;
      service.get(3).subscribe((label) => (result = label));

      http.expectOne(`${URL}/3`).flush(apiLabel(STUDY));

      expect(result).toEqual(STUDY);
      expect(store.byId(3)).toEqual(STUDY);
    });
  });

  describe('create', () => {
    it('POSTs a trimmed name and the color, then stores the new label', () => {
      let result: Label | undefined;
      service.create({ name: '  Study  ', color: '#2563EB' }).subscribe((l) => (result = l));

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'Study', color: '#2563EB' });
      req.flush(apiLabel(STUDY), { status: 201, statusText: 'Created' });

      expect(result).toEqual(STUDY);
      expect(store.labels()).toEqual([STUDY]);
    });

    it('sends no color as null', () => {
      service.create({ name: 'errands', color: null }).subscribe();

      expect(http.expectOne(URL).request.body).toEqual({ name: 'errands', color: null });
    });

    it('leaves the store alone when creation fails', () => {
      service.create({ name: 'Study', color: null }).subscribe({ error: () => {} });

      http.expectOne(URL).flush({ error: 'taken' }, { status: 409, statusText: 'Conflict' });

      expect(store.labels()).toEqual([]);
    });
  });

  describe('update', () => {
    it('PUTs only the changes and stores the label the server returns', () => {
      store.setLabels([STUDY]);
      const renamed = { ...STUDY, name: 'Reading' };
      let result: Label | undefined;
      service.update(3, { name: ' Reading ' }).subscribe((l) => (result = l));

      const req = http.expectOne(`${URL}/3`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ name: 'Reading' });
      req.flush(apiLabel(renamed));

      expect(result).toEqual(renamed);
      expect(store.byId(3)).toEqual(renamed);
    });

    it('sends a color-only change untouched, including null', () => {
      service.update(3, { color: null }).subscribe();

      expect(http.expectOne(`${URL}/3`).request.body).toEqual({ color: null });
    });

    it('keeps the stored label when the update fails', () => {
      store.setLabels([STUDY]);
      service.update(3, { name: 'Reading' }).subscribe({ error: () => {} });

      http.expectOne(`${URL}/3`).flush(null, { status: 500, statusText: 'Error' });

      expect(store.byId(3)).toEqual(STUDY);
    });
  });

  describe('delete', () => {
    it('DELETEs the label and removes it from the store', () => {
      store.setLabels([STUDY, ERRANDS]);
      let done = false;
      service.delete(3).subscribe(() => (done = true));

      const req = http.expectOne(`${URL}/3`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(done).toBe(true);
      expect(store.labels()).toEqual([ERRANDS]);
    });

    it('keeps the label when the delete fails', () => {
      store.setLabels([STUDY]);
      service.delete(3).subscribe({ error: () => {} });

      http.expectOne(`${URL}/3`).flush(null, { status: 404, statusText: 'Not Found' });

      expect(store.labels()).toEqual([STUDY]);
    });
  });
});
