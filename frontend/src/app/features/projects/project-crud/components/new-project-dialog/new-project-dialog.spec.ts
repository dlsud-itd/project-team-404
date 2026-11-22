import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { ProjectsStore } from '../../../shared/state/projects.store';
import { apiProject } from '../../../testing/helpers/api-project';
import { NewProjectDialog } from './new-project-dialog';

const URL = `${environment.apiBaseUrl}/api/projects`;
const CAPSTONE = {
  projectId: 10,
  name: 'Capstone',
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};

describe('NewProjectDialog', () => {
  let fixture: ComponentFixture<NewProjectDialog>;
  let page: HTMLElement;
  let store: ProjectsStore;
  let http: HttpTestingController;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T;
  const nameInput = () => el<HTMLInputElement>('#project-name');

  function typeName(value: string): void {
    nameInput().value = value;
    nameInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    el('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function pressEscape(): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewProjectDialog],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ProjectsStore);
    store.creating.set(true);
    fixture = TestBed.createComponent(NewProjectDialog);
    page = fixture.nativeElement;
    document.body.appendChild(page);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    page.remove();
    http.verify();
  });

  it('is a labelled modal dialog holding the form', () => {
    const dialog = el('[role="dialog"]');

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('new-project-title');
    expect(el('#new-project-title').textContent?.trim()).toBe('New project');
    expect(dialog.querySelector('form')).toBeTruthy();
    expect(dialog.querySelector('button[type="submit"]')?.textContent).toContain('Create project');
  });

  it('shows only the form, without the page link or a page landmark', () => {
    expect(el('.back')).toBeNull();
    expect(el('h1')).toBeNull();
    expect(el('main')).toBeNull();
    expect(el('[role="main"]')).toBeNull();
  });

  it('starts on the name field', () => {
    expect(document.activeElement).toBe(nameInput());
  });

  it('closes with Cancel', () => {
    el<HTMLButtonElement>('button.secondary').click();

    expect(store.creating()).toBe(false);
  });

  it('closes with Escape, wherever the focus is', () => {
    pressEscape();

    expect(store.creating()).toBe(false);
  });

  it('closes with Escape from inside the form', () => {
    nameInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(store.creating()).toBe(false);
  });

  it('stays open when the backdrop is clicked, so typed text is not lost', () => {
    typeName('Capstone');

    el('.backdrop').click();

    expect(store.creating()).toBe(true);
  });

  it('stays open on Escape while saving', () => {
    typeName('Capstone');
    submit();

    pressEscape();

    expect(store.creating()).toBe(true);
    http.expectOne(URL).flush(apiProject(CAPSTONE));
  });

  it('closes after creating and adds the project to the store', () => {
    typeName('Capstone');
    submit();
    http.expectOne(URL).flush(apiProject(CAPSTONE));

    expect(store.creating()).toBe(false);
    expect(store.byId(10)?.name).toBe('Capstone');
  });

  it('stays open and keeps the input when saving fails', () => {
    typeName('Capstone');
    submit();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(store.creating()).toBe(true);
    expect(nameInput().value).toBe('Capstone');
    expect(el('.form-error').textContent).toContain('Something went wrong.');
  });

  it('clears the open state when it is destroyed, so it cannot reopen by itself', () => {
    fixture.destroy();

    expect(store.creating()).toBe(false);
  });

  it('returns focus to what was focused before it opened', async () => {
    fixture.destroy();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const reopened = TestBed.createComponent(NewProjectDialog);
    document.body.appendChild(reopened.nativeElement);
    reopened.detectChanges();
    await reopened.whenStable();
    reopened.destroy();

    expect(document.activeElement).toBe(opener);
    opener.remove();
    (reopened.nativeElement as HTMLElement).remove();
  });
});
