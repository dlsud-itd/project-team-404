import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ProjectsStore } from '../../shared/state/projects.store';
import type { Project } from '../../shared/types/project.types';
import { ProjectService } from './project.service';
import { apiProject } from '../../testing/helpers/api-project';

const URL = `${environment.apiBaseUrl}/api/projects`;
const INBOX: Project = {
  projectId: 1,
  name: 'Inbox',
  description: null,
  color: null,
  isInbox: true,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};
const CAPSTONE: Project = {
  ...INBOX,
  projectId: 10,
  name: 'Capstone',
  description: 'Final project',
  color: '#2563EB',
  isInbox: false,
};

describe('ProjectService', () => {
  let service: ProjectService;
  let store: ProjectsStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectService);
    store = TestBed.inject(ProjectsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list', () => {
    it('gets active projects when no filter is given', () => {
      let result: Project[] | undefined;
      service.list().subscribe((projects) => (result = projects));

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      req.flush([
        { ...apiProject(INBOX), createdAt: '2026-10-20T00:00:00.000Z' },
        { ...apiProject(CAPSTONE), updatedAt: '2026-10-20T00:00:00.000Z' },
      ]);

      // id becomes projectId; timestamps are kept for sorting.
      expect(result).toEqual([
        { ...INBOX, createdAt: '2026-10-20T00:00:00.000Z' },
        { ...CAPSTONE, updatedAt: '2026-10-20T00:00:00.000Z' },
      ]);
    });

    it.each([true, false])('sends isArchived=%s when asked', (archived) => {
      service.list(archived).subscribe();

      http.expectOne(`${URL}?isArchived=${archived}`).flush([]);
    });
  });

  describe('refresh', () => {
    it('loads active and archived projects into the store', () => {
      service.refresh().subscribe();
      expect(store.loading()).toBe(true);

      http.expectOne(`${URL}?isArchived=false`).flush([INBOX, CAPSTONE].map(apiProject));
      http
        .expectOne(`${URL}?isArchived=true`)
        .flush([apiProject({ ...CAPSTONE, isArchived: true, projectId: 11, name: 'Old' })]);

      expect(store.loading()).toBe(false);
      expect(store.projects()).toEqual([
        INBOX,
        CAPSTONE,
        { ...CAPSTONE, isArchived: true, projectId: 11, name: 'Old' },
      ]);
    });

    it('records a failure in the store', () => {
      service.refresh().subscribe({ error: () => {} });

      http
        .expectOne(`${URL}?isArchived=false`)
        .flush(null, { status: 500, statusText: 'Server Error' });
      expect(http.expectOne(`${URL}?isArchived=true`).cancelled).toBe(true);

      expect(store.loading()).toBe(false);
      expect(store.error()).toBe('Something went wrong. Please try again.');
    });
  });

  it('gets one project by id and keeps it in the store', () => {
    let result: Project | undefined;
    service.get(10).subscribe((project) => (result = project));

    const req = http.expectOne(`${URL}/10`);
    expect(req.request.method).toBe('GET');
    req.flush(apiProject(CAPSTONE));

    expect(result).toEqual(CAPSTONE);
    expect(store.byId(10)).toEqual(CAPSTONE);
  });

  it('creates a project with only name, description and color', () => {
    const request = { name: 'Capstone', description: null, color: null, isInbox: true };
    service.create(request).subscribe();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Capstone', description: null, color: null });
    req.flush(apiProject(CAPSTONE));

    expect(store.byId(10)).toEqual(CAPSTONE);
  });

  it('PATCHes only the changed fields and keeps the saved project in the store', () => {
    store.setProjects([CAPSTONE]);
    let result: Project | undefined;
    service.update(10, { description: null }).subscribe((project) => (result = project));

    const req = http.expectOne(`${URL}/10`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ description: null });
    req.flush(apiProject({ ...CAPSTONE, description: null }));

    expect(result).toEqual({ ...CAPSTONE, description: null });
    expect(store.byId(10)).toEqual({ ...CAPSTONE, description: null });
  });

  it('leaves the store alone when an update fails', () => {
    store.setProjects([CAPSTONE]);
    service.update(10, { name: 'Renamed' }).subscribe({ error: () => {} });

    http
      .expectOne(`${URL}/10`)
      .flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });

    expect(store.byId(10)?.name).toBe('Capstone');
  });

  it('deletes a project on 204 No Content, removes it from the store and reports 0 moved', () => {
    store.setProjects([INBOX, CAPSTONE]);
    let moved: number | undefined;
    service.delete(10).subscribe(({ movedTaskCount }) => (moved = movedTaskCount));

    const req = http.expectOne(`${URL}/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(moved).toBe(0);
    expect(store.projects()).toEqual([INBOX]);
  });

  it('reports the moved-task count when the server sends one', () => {
    let moved: number | undefined;
    service.delete(10).subscribe(({ movedTaskCount }) => (moved = movedTaskCount));

    http.expectOne(`${URL}/10`).flush({ movedTaskCount: 4 });

    expect(moved).toBe(4);
  });
});
