import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ProjectsStore } from '../../shared/state/projects.store';
import type { Project } from '../../shared/types/project.types';
import { ProjectOrganizationService } from './project-organization.service';

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
const CAPSTONE: Project = { ...INBOX, projectId: 10, name: 'Capstone', isInbox: false };
const GYM: Project = { ...CAPSTONE, projectId: 11, name: 'Gym', sortOrder: 1 };

describe('ProjectOrganizationService', () => {
  let service: ProjectOrganizationService;
  let store: ProjectsStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectOrganizationService);
    store = TestBed.inject(ProjectsStore);
    http = TestBed.inject(HttpTestingController);
    store.setProjects([INBOX, CAPSTONE, GYM]);
  });

  afterEach(() => http.verify());

  describe('setFavorite', () => {
    it('stars the project before the server answers', () => {
      let result: unknown;
      service.setFavorite(CAPSTONE, true).subscribe((response) => (result = response));

      expect(store.byId(10)?.isFavorite).toBe(true);

      const req = http.expectOne(`${URL}/10/favorite`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ isFavorite: true });
      const response = { projectId: 10, isFavorite: true, message: 'Project added to favorites' };
      req.flush(response);

      expect(result).toEqual(response);
      expect(store.byId(10)?.isFavorite).toBe(true);
    });

    it('puts the old value back and passes the error on when the request fails', () => {
      let error: unknown;
      service.setFavorite(CAPSTONE, true).subscribe({ error: (e: unknown) => (error = e) });

      http.expectOne(`${URL}/10/favorite`).flush(null, { status: 500, statusText: 'Server Error' });

      expect(store.byId(10)?.isFavorite).toBe(false);
      expect((error as HttpErrorResponse).status).toBe(500);
    });

    it('does nothing until subscribed', () => {
      service.setFavorite(CAPSTONE, true);

      expect(store.byId(10)?.isFavorite).toBe(false);
      http.expectNone(`${URL}/10/favorite`);
    });
  });

  describe('setArchived', () => {
    it('archives the project straight away', () => {
      service.setArchived(GYM, true).subscribe();

      expect(store.byId(11)?.isArchived).toBe(true);
      expect(store.active().map((p) => p.projectId)).toEqual([1, 10]);

      const req = http.expectOne(`${URL}/11/archive`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ isArchived: true });
      req.flush({ projectId: 11, isArchived: true, message: 'Project archived successfully' });
    });

    it('restores an archived project', () => {
      store.patch(11, { isArchived: true });

      service.setArchived({ ...GYM, isArchived: true }, false).subscribe();

      expect(store.byId(11)?.isArchived).toBe(false);
      const req = http.expectOne(`${URL}/11/archive`);
      expect(req.request.body).toEqual({ isArchived: false });
      req.flush({ projectId: 11, isArchived: false, message: 'Project restored from archive' });
    });

    it('rolls back when the project is gone', () => {
      service.setArchived(GYM, true).subscribe({ error: () => {} });

      http
        .expectOne(`${URL}/11/archive`)
        .flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });

      expect(store.byId(11)?.isArchived).toBe(false);
    });
  });

  describe('reorder', () => {
    const payload = {
      request: { projectIds: [11, 10] },
      sortOrders: [
        { projectId: 11, sortOrder: 0 },
        { projectId: 10, sortOrder: 1 },
      ],
    };

    it('shows the new order straight away and sends it', () => {
      service.reorder(payload).subscribe();

      expect(store.projects().map((p) => p.name)).toEqual(['Inbox', 'Gym', 'Capstone']);

      const req = http.expectOne(`${URL}/reorder`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ projectIds: [11, 10] });
      req.flush({ projects: payload.sortOrders, message: 'Project order updated successfully' });
    });

    it('keeps the sort orders the server saved', () => {
      service.reorder(payload).subscribe();

      http.expectOne(`${URL}/reorder`).flush({
        projects: [
          { projectId: 11, sortOrder: 5 },
          { projectId: 10, sortOrder: 6 },
        ],
        message: 'Project order updated successfully',
      });

      expect(store.byId(11)?.sortOrder).toBe(5);
      expect(store.byId(10)?.sortOrder).toBe(6);
    });

    it('puts the old order back when the request fails', () => {
      let error: unknown;
      service.reorder(payload).subscribe({ error: (e: unknown) => (error = e) });

      http.expectOne(`${URL}/reorder`).flush(null, { status: 500, statusText: 'Server Error' });

      expect(store.projects().map((p) => p.name)).toEqual(['Inbox', 'Capstone', 'Gym']);
      expect(store.byId(10)?.sortOrder).toBe(0);
      expect(store.byId(11)?.sortOrder).toBe(1);
      expect(error).toBeInstanceOf(HttpErrorResponse);
    });
  });
});
