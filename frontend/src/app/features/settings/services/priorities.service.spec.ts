import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import type { DeletePriorityResult, PriorityLevel } from '../types/settings.types';
import { PrioritiesService } from './priorities.service';

const URL = `${environment.apiBaseUrl}/api/priorities`;

const LEVELS = [
  { id: 3, name: 'High', color: '#D84A4A', sortOrder: 2, isDefault: false, taskCount: 1 },
  { id: 1, name: 'Low', color: '#6E9F79', sortOrder: 0, isDefault: false, taskCount: 2 },
  { id: 2, name: 'Medium', color: '#D59B38', sortOrder: 1, isDefault: true, taskCount: 5 },
];

describe('PrioritiesService', () => {
  let service: PrioritiesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PrioritiesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the user’s levels in their order', () => {
    let levels: PriorityLevel[] = [];
    service.list().subscribe((result) => (levels = result));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush(LEVELS);

    expect(levels.map((level) => level.name)).toEqual(['Low', 'Medium', 'High']);
    expect(levels[1]).toEqual(LEVELS[2]);
  });

  it('treats a missing task count as unknown', () => {
    let levels: PriorityLevel[] = [];
    service.list().subscribe((result) => (levels = result));
    const withoutCount: Partial<(typeof LEVELS)[number]> = { ...LEVELS[0] };
    delete withoutCount.taskCount;
    http.expectOne(URL).flush([withoutCount]);
    expect(levels[0].taskCount).toBeNull();
  });

  it('creates and updates a level', () => {
    let created: PriorityLevel | undefined;
    service.create({ name: 'Urgent', color: '#C44536' }).subscribe((level) => (created = level));
    const create = http.expectOne(URL);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ name: 'Urgent', color: '#C44536' });
    create.flush(
      { id: 4, name: 'Urgent', color: '#C44536', sortOrder: 3, isDefault: false, taskCount: 0 },
      { status: 201, statusText: 'Created' },
    );
    expect(created?.id).toBe(4);

    service.update(4, { name: 'Critical', color: '#B93A32' }).subscribe();
    const update = http.expectOne(`${URL}/4`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ name: 'Critical', color: '#B93A32' });
    update.flush({ ...LEVELS[0], id: 4, name: 'Critical' });
  });

  it('deletes an unused level without reassignTo', () => {
    service.delete(4, null).subscribe();
    const req = http.expectOne(`${URL}/4`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.has('reassignTo')).toBe(false);
    req.flush({ deletedId: 4, reassignedTo: null, tasksReassigned: 0 });
  });

  it('deletes a level and moves its tasks to another', () => {
    let result: DeletePriorityResult | undefined;
    service.delete(4, 2).subscribe((body) => (result = body));
    const req = http.expectOne((r) => r.url === `${URL}/4`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('reassignTo')).toBe('2');
    req.flush({ deletedId: 4, reassignedTo: 2, tasksReassigned: 3 });
    expect(result).toEqual({ deletedId: 4, reassignedTo: 2, tasksReassigned: 3 });
  });

  it('sets the default level', () => {
    service.setDefault(3).subscribe();
    const req = http.expectOne(`${URL}/3/default`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush({ id: 3, isDefault: true });
  });

  it('saves a new order', () => {
    let saved: number[] = [];
    service.reorder([3, 1, 2]).subscribe((ids) => (saved = ids));
    const req = http.expectOne(`${URL}/reorder`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ priorityIds: [3, 1, 2] });
    req.flush({ priorityIds: [3, 1, 2] });
    expect(saved).toEqual([3, 1, 2]);
  });
});
