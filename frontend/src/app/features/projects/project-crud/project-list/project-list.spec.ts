import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import type { Project } from '../../shared/types/project.types';
import { ProjectList } from './project-list';
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
const CAPSTONE: Project = {
  ...base,
  projectId: 10,
  name: 'Capstone',
  isInbox: false,
  sortOrder: 1,
};
const GYM: Project = { ...base, projectId: 11, name: 'Gym', isInbox: false, isFavorite: true };
const OLD: Project = {
  ...base,
  projectId: 12,
  name: 'Old class',
  isInbox: false,
  isArchived: true,
};

describe('ProjectList', () => {
  let fixture: ComponentFixture<ProjectList>;
  let http: HttpTestingController;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const cardNames = (scope = '') =>
    [...page.querySelectorAll(`${scope} app-project-card .name`)].map((n) =>
      n.childNodes[0].textContent?.trim(),
    );
  const render = () => fixture.detectChanges();

  function loadWith(projects: Project[]): void {
    http
      .expectOne(`${URL}?isArchived=false`)
      .flush(projects.filter((project) => !project.isArchived).map(apiProject));
    http
      .expectOne(`${URL}?isArchived=true`)
      .flush(projects.filter((project) => project.isArchived).map(apiProject));
    render();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProjectList);
    page = fixture.nativeElement;
    render();
  });

  afterEach(() => http.verify());

  it('shows a loading state until the list arrives', () => {
    expect(text('[role="status"]')).toBe('Loading projects…');

    loadWith([INBOX]);

    expect(el('.status')).toBeNull();
  });

  it('lists the Inbox first, favorites in their own section, and hides archived projects', () => {
    loadWith([CAPSTONE, OLD, GYM, INBOX]);

    expect(cardNames()).toEqual(['Inbox', 'Gym', 'Capstone']);
    expect(cardNames('[aria-labelledby="favorites-heading"]')).toEqual(['Gym']);
    expect(page.textContent).not.toContain('Old class');
  });

  it('opens the new-project popup from the header', () => {
    loadWith([INBOX, CAPSTONE]);
    expect(el('app-new-project-dialog')).toBeNull();

    el<HTMLButtonElement>('.title-row button.new')!.click();
    render();

    expect(el('app-new-project-dialog [role="dialog"]')).toBeTruthy();
  });

  it('invites the user to create a project when only the Inbox exists', () => {
    loadWith([INBOX]);

    expect(text('.empty-title')).toBe('You only have your Inbox so far.');

    el<HTMLButtonElement>('.empty button.new')!.click();
    render();

    expect(el('app-new-project-dialog [role="dialog"]')).toBeTruthy();
  });

  it('shows an error with a retry action when the list fails', () => {
    http
      .expectOne(`${URL}?isArchived=false`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(http.expectOne(`${URL}?isArchived=true`).cancelled).toBe(true);
    render();

    expect(text('.load-error p')).toContain('Something went wrong. Please try again.');

    el<HTMLButtonElement>('button.retry')!.click();
    loadWith([INBOX, CAPSTONE]);

    expect(el('.load-error')).toBeNull();
    expect(cardNames()).toEqual(['Inbox', 'Capstone']);
  });

  describe('filtering and sorting', () => {
    const BLUE: Project = { ...CAPSTONE, projectId: 13, name: 'Blue notes', color: '#2563EB' };

    async function goTo(url: string): Promise<void> {
      await TestBed.inject(Router).navigateByUrl(url);
      await fixture.whenStable();
      render();
    }

    const chip = (name: string) =>
      [...page.querySelectorAll<HTMLButtonElement>('app-project-filter-bar .chip')].find((c) =>
        c.textContent?.trim().startsWith(name),
      )!;

    it('shows only favorites when the chip is pressed and puts it in the URL', async () => {
      loadWith([CAPSTONE, OLD, GYM, INBOX]);

      chip('Favorites').click();
      await fixture.whenStable();
      render();

      expect(TestBed.inject(Router).url).toBe('/?favorites=true');
      expect(chip('Favorites').getAttribute('aria-pressed')).toBe('true');
      expect(cardNames()).toEqual(['Gym']);
      expect(text('#results-heading')).toBe('Projects · 1');
    });

    it('never shows archived projects, even from an old ?archived link, and filters by color', async () => {
      loadWith([CAPSTONE, OLD, GYM, BLUE, INBOX]);

      await goTo('/?archived=true');
      expect(cardNames()).not.toContain('Old class');

      await goTo('/?color=%232563eb');
      expect(cardNames()).toEqual(['Blue notes']);
    });

    it('links to archived projects on the Archive page instead of toggling them', () => {
      loadWith([CAPSTONE, INBOX]);

      const link = [
        ...page.querySelectorAll<HTMLAnchorElement>('app-project-filter-bar a.chip'),
      ].find((a) => a.textContent?.includes('Archived'));
      expect(link?.getAttribute('href')).toBe('/archive?tab=projects');
    });

    it('sorts by name, keeping the Inbox on top while nothing is filtered', async () => {
      loadWith([CAPSTONE, GYM, BLUE, INBOX]);

      await goTo('/?sort=name&dir=desc');

      expect(cardNames()).toEqual(['Inbox', 'Gym', 'Capstone', 'Blue notes']);
      expect(el('#favorites-heading')).toBeNull();
      expect(text('app-sort-menu .trigger')).toContain('Name');
    });

    it('offers to clear the filters when no project matches', async () => {
      loadWith([CAPSTONE, GYM, INBOX]);
      await goTo('/?favorites=true&color=%232563EB');

      expect(text('.empty-title')).toBe('No projects match these filters.');

      el<HTMLButtonElement>('.empty button.new')!.click();
      await fixture.whenStable();
      render();

      expect(TestBed.inject(Router).url).toBe('/');
      expect(cardNames()).toEqual(['Inbox', 'Gym', 'Capstone']);
    });
  });

  describe('custom order', () => {
    const NOTES: Project = { ...CAPSTONE, projectId: 14, name: 'Notes', sortOrder: 2 };

    it('has no subtabs and no delete buttons', () => {
      loadWith([INBOX, CAPSTONE, NOTES]);

      expect(el('nav.tabs')).toBeNull();
      expect(page.textContent).not.toContain('Organize');
      expect(el('button[aria-label^="Delete"]')).toBeNull();
    });

    it('shows a drag handle on each reorderable project', () => {
      loadWith([INBOX, CAPSTONE, NOTES, GYM]);

      expect(page.querySelectorAll('.item .hover-handle').length).toBe(3);
      expect(page.querySelectorAll('app-project-card.inbox').length).toBe(1);
    });

    it('moves a project with Alt+Down and saves the whole order', () => {
      loadWith([INBOX, CAPSTONE, NOTES]);

      const first = page.querySelectorAll<HTMLElement>('#projects-heading ~ ul .item')[0];
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }));
      render();

      const req = http.expectOne(`${URL}/reorder`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ projectIds: [14, 10] });
      expect(cardNames('#projects-heading ~ ul')).toEqual(['Notes', 'Capstone']);
      req.flush({
        projects: [
          { projectId: 14, sortOrder: 0 },
          { projectId: 10, sortOrder: 1 },
        ],
        message: 'ok',
      });
    });

    it('puts the order back and says so when saving fails', () => {
      loadWith([INBOX, CAPSTONE, NOTES]);

      const first = page.querySelectorAll<HTMLElement>('#projects-heading ~ ul .item')[0];
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }));
      http
        .expectOne(`${URL}/reorder`)
        .flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
      render();

      expect(cardNames('#projects-heading ~ ul')).toEqual(['Capstone', 'Notes']);
      expect(text('.banner-error')).toContain("Your new order wasn't saved.");
    });
  });
});
