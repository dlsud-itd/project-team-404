import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ProjectsStore } from '../../shared/state/projects.store';
import type { Project } from '../../shared/types/project.types';
import { ProjectService } from './project.service';

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
    it('gets every project when no filter is given', () => {
      let result: Project[] | undefined;
      service.list().subscribe((projects) => (result = projects));

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      req.flush([INBOX, CAPSTONE]);

      expect(result).toEqual([INBOX, CAPSTONE]);
    });

    it.each([true, false])('sends archived=%s when asked', (archived) => {
      service.list(archived).subscribe();

      http.expectOne(`${URL}?archived=${archived}`).flush([]);
    });
  });

  describe('refresh', () => {
    it('loads the list into the store', () => {
      service.refresh().subscribe();
      expect(store.loading()).toBe(true);

      http.expectOne(URL).flush([CAPSTONE, INBOX]);

      expect(store.loading()).toBe(false);
      expect(store.projects()).toEqual([INBOX, CAPSTONE]);
    });

    it('records a failure in the store', () => {
      service.refresh().subscribe({ error: () => {} });

      http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });

      expect(store.loading()).toBe(false);
      expect(store.error()).toBe('Something went wrong. Please try again.');
    });
  });

  it('gets one project by id and keeps it in the store', () => {
    let result: Project | undefined;
    service.get(10).subscribe((project) => (result = project));

    const req = http.expectOne(`${URL}/10`);
    expect(req.request.method).toBe('GET');
    req.flush(CAPSTONE);

    expect(result).toEqual(CAPSTONE);
    expect(store.byId(10)).toEqual(CAPSTONE);
  });

  it('creates a project with only name, description and color', () => {
    const request = { name: 'Capstone', description: null, color: null, isInbox: true };
    service.create(request).subscribe();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Capstone', description: null, color: null });
    req.flush(CAPSTONE);

    expect(store.byId(10)).toEqual(CAPSTONE);
  });

  it('updates only the changed fields and patches the store', () => {
    store.setProjects([CAPSTONE]);
    service.update(10, { description: null }).subscribe();

    const req = http.expectOne(`${URL}/10`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ description: null });
    req.flush({ projectId: 10, message: 'Project updated successfully' });

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

  it('deletes a project, removes it from the store and returns the moved-task count', () => {
    store.setProjects([INBOX, CAPSTONE]);
    let moved: number | undefined;
    service.delete(10).subscribe(({ movedTaskCount }) => (moved = movedTaskCount));

    const req = http.expectOne(`${URL}/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Project deleted successfully', movedTaskCount: 4 });

    expect(moved).toBe(4);
    expect(store.projects()).toEqual([INBOX]);
  });
});
