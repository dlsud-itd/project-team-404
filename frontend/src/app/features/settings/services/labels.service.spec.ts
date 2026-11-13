import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import type { LabelSetting } from '../types/settings.types';
import { LabelsService } from './labels.service';

const URL = `${environment.apiBaseUrl}/api/labels`;

const planning = {
  id: 4,
  name: 'Planning',
  color: '#54A6A1',
  taskCount: 3,
  sortOrder: 1,
  isArchived: false,
  archivedAt: null,
};

describe('LabelsService', () => {
  let service: LabelsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LabelsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists active labels in the user’s order', () => {
    let labels: LabelSetting[] = [];
    service.list().subscribe((result) => (labels = result));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('isArchived')).toBe('false');
    req.flush([planning, { ...planning, id: 9, name: 'Errands', sortOrder: 0 }]);

    expect(labels.map((label) => label.name)).toEqual(['Errands', 'Planning']);
    expect(labels[1]).toEqual(planning);
  });

  it('lists archived labels when asked', () => {
    let labels: LabelSetting[] = [];
    service.list(true).subscribe((result) => (labels = result));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('isArchived')).toBe('true');
    req.flush([{ ...planning, isArchived: true, archivedAt: '2026-11-10T09:30:00.000Z' }]);

    expect(labels).toHaveLength(1);
    expect(labels[0].archivedAt).toBe('2026-11-10T09:30:00.000Z');
  });

  it('fills in Sprint 5 fields an older server leaves out', () => {
    let active: LabelSetting[] = [];
    let archived: LabelSetting[] = [];
    service.list().subscribe((result) => (active = result));
    service.list(true).subscribe((result) => (archived = result));
    const sprint3 = [
      { id: 2, name: 'Home', color: null },
      { id: 5, name: 'Work', color: '#2563EB' },
    ];
    http.match((r) => r.url === URL).forEach((req) => req.flush(sprint3));

    expect(active).toEqual([
      {
        id: 2,
        name: 'Home',
        color: null,
        taskCount: null,
        sortOrder: 0,
        isArchived: false,
        archivedAt: null,
      },
      {
        id: 5,
        name: 'Work',
        color: '#2563EB',
        taskCount: null,
        sortOrder: 1,
        isArchived: false,
        archivedAt: null,
      },
    ]);
    // The old server ignores isArchived and sends active labels, which aren't archived ones.
    expect(archived).toEqual([]);
  });

  it('creates, updates and deletes a label', () => {
    service.create({ name: 'Planning', color: '#54A6A1' }).subscribe();
    const create = http.expectOne(URL);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ name: 'Planning', color: '#54A6A1' });
    create.flush(planning, { status: 201, statusText: 'Created' });

    service.update(4, { name: 'Plans' }).subscribe();
    const update = http.expectOne(`${URL}/4`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ name: 'Plans' });
    update.flush({ ...planning, name: 'Plans' });

    service.delete(4).subscribe();
    const remove = http.expectOne(`${URL}/4`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('saves a new order', () => {
    let saved: number[] = [];
    service.reorder([4, 9, 2]).subscribe((ids) => (saved = ids));

    const req = http.expectOne(`${URL}/reorder`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ labelIds: [4, 9, 2] });
    req.flush({ labelIds: [4, 9, 2] });
    expect(saved).toEqual([4, 9, 2]);
  });

  it('archives and restores a label', () => {
    let archived: LabelSetting | undefined;
    service.setArchived(4, true).subscribe((label) => (archived = label));
    const archive = http.expectOne(`${URL}/4/archive`);
    expect(archive.request.method).toBe('PUT');
    expect(archive.request.body).toEqual({ isArchived: true });
    archive.flush({ ...planning, isArchived: true, archivedAt: '2026-11-10T09:30:00.000Z' });
    expect(archived?.isArchived).toBe(true);

    service.setArchived(4, false).subscribe();
    const restore = http.expectOne(`${URL}/4/archive`);
    expect(restore.request.body).toEqual({ isArchived: false });
    restore.flush(planning);
  });
});
