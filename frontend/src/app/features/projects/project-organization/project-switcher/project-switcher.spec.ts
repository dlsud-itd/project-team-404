import { CdkDropList } from '@angular/cdk/drag-drop';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ProjectsStore } from '../../shared/state/projects.store';
import type { Project } from '../../shared/types/project.types';
import { ProjectSwitcher } from './project-switcher';
import { apiProject } from '../../testing/helpers/api-project';

const URL = `${environment.apiBaseUrl}/api/projects`;
const base: Project = {
  projectId: 1,
  name: 'Inbox',
  description: null,
  color: null,
  isInbox: true,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};
const INBOX = base;
const GYM: Project = { ...base, projectId: 10, name: 'Gym', isInbox: false, isFavorite: true };
const CAPSTONE: Project = {
  ...base,
  projectId: 11,
  name: 'Capstone',
  isInbox: false,
  sortOrder: 1,
};
const THESIS: Project = { ...base, projectId: 12, name: 'Thesis', isInbox: false, sortOrder: 2 };
const OLD: Project = {
  ...base,
  projectId: 13,
  name: 'Old class',
  isInbox: false,
  isArchived: true,
  sortOrder: 3,
};

describe('ProjectSwitcher', () => {
  let fixture: ComponentFixture<ProjectSwitcher>;
  let http: HttpTestingController;
  let store: ProjectsStore;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const button = (label: string) => el<HTMLButtonElement>(`button[aria-label="${label}"]`);
  const names = (scope: string) =>
    [...page.querySelectorAll(`${scope} .name`)].map((n) => n.textContent?.trim());
  const favorites = () => names('[aria-labelledby="switcher-favorites-heading"]');
  const others = () => names('[aria-labelledby="switcher-projects-heading"]');
  const archived = () => names('.archived');
  const render = () => fixture.detectChanges();

  function loadWith(projects: Project[]): void {
    http.expectOne(URL).flush(projects.map(apiProject));
    render();
  }

  function click(label: string): void {
    button(label)!.click();
    render();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectSwitcher],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ProjectsStore);
    fixture = TestBed.createComponent(ProjectSwitcher);
    page = fixture.nativeElement;
    render();
  });

  afterEach(() => http.verify());

  it('shows a loading state, then the Inbox, favorites, other projects and archived ones', () => {
    expect(el('.status')?.textContent).toContain('Loading projects…');

    loadWith([THESIS, OLD, INBOX, CAPSTONE, GYM]);

    expect(el('.inbox .name')?.textContent?.trim()).toBe('Inbox');
    expect(favorites()).toEqual(['Gym']);
    expect(others()).toEqual(['Capstone', 'Thesis']);
    expect(archived()).toEqual(['Old class']);
  });

  it('links to both project views and marks this one as current', () => {
    loadWith([INBOX]);

    const tabs = [...page.querySelectorAll('nav[aria-label="Project views"] a')];
    expect(tabs.map((a) => a.getAttribute('href'))).toEqual([
      '/home?tab=projects',
      '/home?tab=projects&view=organize',
    ]);
  });

  it('gives the Inbox no favorite, archive or move controls', () => {
    loadWith([INBOX, CAPSTONE]);

    expect(el('.inbox .controls')?.children).toHaveLength(0);
    expect(el('.inbox .handle')).toBeNull();
  });

  it('shows hints when there are no favorites or other projects', () => {
    loadWith([INBOX]);

    expect(page.textContent).toContain('Star a project to keep it at the top.');
    expect(el('.archived')).toBeNull();

    el<HTMLButtonElement>('.empty button')!.click();
    render();

    expect(el('app-new-project-dialog [role="dialog"]')).toBeTruthy();
  });

  describe('switching', () => {
    beforeEach(() => loadWith([INBOX, CAPSTONE, THESIS]));

    it('selects a project and marks it as current', () => {
      const thesis = [...page.querySelectorAll<HTMLButtonElement>('button.select')].find((b) =>
        b.textContent?.includes('Thesis'),
      )!;

      thesis.click();
      render();

      expect(store.selectedProjectId()).toBe(12);
      expect(thesis.getAttribute('aria-current')).toBe('true');
      expect(page.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
      expect(el('[role="status"]')?.textContent).toContain('Switched to Thesis.');
    });
  });

  describe('favorites', () => {
    beforeEach(() => loadWith([INBOX, GYM, CAPSTONE]));

    it('stars a project and moves it to Favorites before the server answers', () => {
      click('Favorite Capstone');

      expect(favorites()).toEqual(['Gym', 'Capstone']);
      const req = http.expectOne(`${URL}/11/favorite`);
      expect(req.request.body).toEqual({ isFavorite: true });
      expect(button('Favorite Capstone')?.disabled).toBe(true);

      req.flush({ projectId: 11, isFavorite: true, message: 'Project added to favorites' });
      render();

      expect(button('Favorite Capstone')?.disabled).toBe(false);
      expect(button('Favorite Capstone')?.getAttribute('aria-pressed')).toBe('true');
    });

    it('moves the project back and explains why when the request fails', () => {
      click('Favorite Gym');
      expect(others()).toEqual(['Gym', 'Capstone']);

      http.expectOne(`${URL}/10/favorite`).flush(null, { status: 500, statusText: 'Error' });
      render();

      expect(favorites()).toEqual(['Gym']);
      expect(el('[role="alert"]')?.textContent).toContain("Your change wasn't saved.");
    });
  });

  describe('archiving', () => {
    beforeEach(() => loadWith([INBOX, CAPSTONE, OLD]));

    it('archives a project', () => {
      click('Archive Capstone');

      expect(others()).toEqual([]);
      expect(archived()).toEqual(['Capstone', 'Old class']);
      http
        .expectOne(`${URL}/11/archive`)
        .flush({ projectId: 11, isArchived: true, message: 'Project archived successfully' });
    });

    it('restores an archived project', () => {
      click('Restore Old class');

      expect(others()).toEqual(['Capstone', 'Old class']);
      const req = http.expectOne(`${URL}/13/archive`);
      expect(req.request.body).toEqual({ isArchived: false });
      req.flush({ projectId: 13, isArchived: false, message: 'Project restored from archive' });
    });

    it('reloads the list when the project no longer exists', () => {
      click('Archive Capstone');

      http
        .expectOne(`${URL}/11/archive`)
        .flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });
      render();

      expect(el('[role="alert"]')?.textContent).toContain('Project not found.');
      loadWith([INBOX, OLD]);
      expect(others()).toEqual([]);
    });
  });

  describe('reordering', () => {
    beforeEach(() => loadWith([INBOX, GYM, CAPSTONE, THESIS, OLD]));

    it('moves a project with the keyboard buttons and saves the full order', () => {
      expect(button('Move Capstone up')?.disabled).toBe(true);
      expect(button('Move Thesis down')?.disabled).toBe(true);

      click('Move Capstone down');

      expect(others()).toEqual(['Thesis', 'Capstone']);
      expect(el('[role="status"]')?.textContent).toContain('Moved Capstone to position 2 of 2.');
      expect(button('Move Thesis up')?.disabled).toBe(true);

      const req = http.expectOne(`${URL}/reorder`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ projectIds: [10, 12, 11, 13] });
      req.flush({
        projects: [
          { projectId: 10, sortOrder: 0 },
          { projectId: 12, sortOrder: 1 },
          { projectId: 11, sortOrder: 2 },
          { projectId: 13, sortOrder: 3 },
        ],
        message: 'Project order updated successfully',
      });
      render();

      expect(others()).toEqual(['Thesis', 'Capstone']);
      expect(button('Move Thesis down')?.disabled).toBe(false);
    });

    it('saves the order after a drag and drop', () => {
      const lists = fixture.debugElement.queryAll(By.directive(CdkDropList));
      lists[1].triggerEventHandler('cdkDropListDropped', { previousIndex: 1, currentIndex: 0 });
      render();

      expect(others()).toEqual(['Thesis', 'Capstone']);
      http.expectOne(`${URL}/reorder`).flush({ projects: [], message: 'ok' });
    });

    it('sends nothing when a project is dropped where it was', () => {
      const lists = fixture.debugElement.queryAll(By.directive(CdkDropList));
      lists[0].triggerEventHandler('cdkDropListDropped', { previousIndex: 0, currentIndex: 0 });

      http.expectNone(`${URL}/reorder`);
    });

    it('puts the old order back when saving fails', () => {
      click('Move Thesis up');
      expect(others()).toEqual(['Thesis', 'Capstone']);

      http.expectOne(`${URL}/reorder`).flush(null, { status: 500, statusText: 'Error' });
      render();

      expect(others()).toEqual(['Capstone', 'Thesis']);
      expect(el('[role="alert"]')?.textContent).toContain("Your change wasn't saved.");
    });
  });
});
