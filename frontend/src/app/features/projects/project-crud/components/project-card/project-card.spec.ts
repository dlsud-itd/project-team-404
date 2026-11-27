import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { DEFAULT_SETTINGS } from '../../../../settings/types/user-settings.types';
import { ProjectsStore } from '../../../shared/state/projects.store';
import type { Project } from '../../../shared/types/project.types';
import { ProjectCard } from './project-card';

const API = `${environment.apiBaseUrl}/api`;

const CAPSTONE: Project = {
  projectId: 10,
  name: 'Capstone',
  description: 'Final requirements',
  color: '#2563EB',
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};
const INBOX: Project = {
  ...CAPSTONE,
  projectId: 1,
  name: 'Inbox',
  description: null,
  color: null,
  isInbox: true,
};

describe('ProjectCard', () => {
  let fixture: ComponentFixture<ProjectCard>;
  let page: HTMLElement;
  let http: HttpTestingController;
  let store: ProjectsStore;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  /** CDK menus render in an overlay outside the component. */
  const menuItem = (label: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('.cdk-overlay-container .item')].find((b) =>
      b.textContent?.includes(label),
    );

  function render(project: Project): void {
    store.setProjects(
      [INBOX, CAPSTONE].map((p) => (p.projectId === project.projectId ? project : p)),
    );
    fixture.componentRef.setInput('project', project);
    fixture.detectChanges();
  }

  function openMenu(): void {
    el<HTMLButtonElement>('button.more')!.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCard],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ProjectsStore);
    fixture = TestBed.createComponent(ProjectCard);
    page = fixture.nativeElement;
  });

  afterEach(() => http.verify());

  it('shows the name, description and its color as a small dot', () => {
    render(CAPSTONE);

    expect(el('.name')?.textContent).toContain('Capstone');
    expect(el('.description')?.textContent).toContain('Final requirements');
    expect(el<HTMLElement>('.dot')?.style.background).toBe('rgb(37, 99, 235)');
  });

  it("links the name to the project's tasks, Inbox included", () => {
    render(CAPSTONE);
    expect(el('a.tasks-link')?.getAttribute('href')).toBe('/projects/10/tasks');

    render(INBOX);
    expect(el('a.tasks-link')?.getAttribute('href')).toBe('/projects/1/tasks');
  });

  it('offers Edit, Set as default and Archive in its menu, and never Delete', () => {
    render(CAPSTONE);
    openMenu();

    expect(menuItem('Edit')).toBeTruthy();
    expect(menuItem('Set as default project')).toBeTruthy();
    expect(menuItem('Archive')).toBeTruthy();
    expect(menuItem('Delete')).toBeUndefined();
    expect(page.textContent).not.toContain('Delete');
  });

  it('marks the Inbox read-only: no star, edit or archive', () => {
    render(INBOX);

    expect(el('.badge')?.textContent).toContain('Read-only');
    expect(el('button.star')).toBeNull();
    openMenu();
    expect(menuItem('Edit')).toBeUndefined();
    expect(menuItem('Archive')).toBeUndefined();
  });

  it('shows the Inbox as the default until another project is chosen', () => {
    render(INBOX);
    expect(page.textContent).toContain('Default');

    render(CAPSTONE);
    expect(page.textContent).not.toContain('Default');
  });

  it('saves the project as the default for new tasks', () => {
    render(CAPSTONE);
    openMenu();
    menuItem('Set as default project')!.click();

    const req = http.expectOne(`${API}/settings`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ defaultProjectId: 10 });
    req.flush({ ...DEFAULT_SETTINGS, defaultProjectId: 10 });
    fixture.detectChanges();

    expect(store.defaultProject()?.projectId).toBe(10);
    expect(page.textContent).toContain('Default');
  });

  it('stars the project, which pins it to the dashboard', () => {
    render(CAPSTONE);
    el<HTMLButtonElement>('button.star')!.click();

    const req = http.expectOne(`${API}/projects/10/favorite`);
    expect(req.request.body).toEqual({ isFavorite: true });
    expect(store.byId(10)?.isFavorite).toBe(true);
    req.flush({ projectId: 10, isFavorite: true, message: 'ok' });
  });

  it('archives the project at once', () => {
    render(CAPSTONE);
    openMenu();
    menuItem('Archive')!.click();

    const req = http.expectOne(`${API}/projects/10/archive`);
    expect(req.request.body).toEqual({ isArchived: true });
    expect(store.byId(10)?.isArchived).toBe(true);
    req.flush({ projectId: 10, isArchived: true, message: 'ok' });
  });

  it('leaves out an empty description', () => {
    render({ ...CAPSTONE, description: null });

    expect(el('.description')).toBeNull();
  });

  it('shows a starred project as pressed', () => {
    render({ ...CAPSTONE, isFavorite: true });

    expect(el('button.star')?.getAttribute('aria-pressed')).toBe('true');
    expect(el('button.star')?.getAttribute('aria-label')).toBe('Unstar Capstone');
  });
});
