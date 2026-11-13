import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../shared/services/toast.service';
import { SessionService, type SessionUser } from '../../auth/session/session.service';
import {
  BUILT_IN_PRIORITIES,
  PrioritiesStore,
  providePriorityLevels,
  REORDER_FAILED_MESSAGE,
} from './priorities.store';

const URL = `${environment.apiBaseUrl}/api/priorities`;

const LEVELS = [
  { id: 11, name: 'Low', color: '#6E9F79', sortOrder: 0, isDefault: false, taskCount: 2 },
  { id: 12, name: 'Medium', color: '#D59B38', sortOrder: 1, isDefault: true, taskCount: 5 },
  { id: 13, name: 'High', color: null, sortOrder: 2, isDefault: false, taskCount: 1 },
];

describe('PrioritiesStore', () => {
  let store: PrioritiesStore;
  let http: HttpTestingController;

  const names = () => store.levels().map((level) => level.name);

  function loadLevels(): void {
    store.load();
    http.expectOne(URL).flush(LEVELS);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(PrioritiesStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts with the built-in levels, sent to the server by their Sprint 3 names', () => {
    expect(store.levels()).toEqual(BUILT_IN_PRIORITIES);
    expect(store.source()).toBe('built-in');
    expect(store.editable()).toBe(false);
    expect(store.defaultLevel().name).toBe('Medium');
    expect(store.legacyName(1)).toBe('high');
    expect(store.legacyName(3)).toBe('low');
  });

  it('loads the user’s levels in their order, then sends them by id', () => {
    loadLevels();

    expect(names()).toEqual(['Low', 'Medium', 'High']);
    expect(store.source()).toBe('server');
    expect(store.editable()).toBe(true);
    expect(store.defaultLevel().id).toBe(12);
    expect(store.legacyName(1)).toBeUndefined();
    expect(store.nameOf(13)).toBe('High');
    expect(store.colorOf(11)).toBe('#6E9F79');
    // A level without a color, or one that no longer exists, gets the neutral swatch.
    expect(store.colorOf(13)).toBe('#A8A29E');
    expect(store.nameOf(99)).toBe('No priority');
  });

  it('keeps the built-in levels and reports an error when loading fails', () => {
    store.load();
    expect(store.loading()).toBe(true);
    http.expectOne(URL).flush(null, { status: 404, statusText: 'Not Found' });

    expect(store.loading()).toBe(false);
    expect(store.error()).toContain('priority levels');
    expect(store.levels()).toEqual(BUILT_IN_PRIORITIES);
    expect(store.source()).toBe('built-in');
  });

  it('reorders at once and keeps the order when saving succeeds', () => {
    loadLevels();
    store.reorder([13, 11, 12]);
    expect(names()).toEqual(['High', 'Low', 'Medium']);

    const req = http.expectOne(`${URL}/reorder`);
    expect(req.request.body).toEqual({ priorityIds: [13, 11, 12] });
    req.flush({ priorityIds: [13, 11, 12] });
    expect(names()).toEqual(['High', 'Low', 'Medium']);
    expect(TestBed.inject(ToastService).toasts()).toEqual([]);
  });

  it('puts the old order back and shows an error toast when saving the order fails', () => {
    loadLevels();
    store.reorder([13, 11, 12]);
    expect(names()).toEqual(['High', 'Low', 'Medium']);

    http
      .expectOne(`${URL}/reorder`)
      .flush({ error: 'Bad order' }, { status: 400, statusText: 'Bad Request' });

    expect(names()).toEqual(['Low', 'Medium', 'High']);
    expect(TestBed.inject(ToastService).toasts()).toEqual([
      expect.objectContaining({ kind: 'error', message: REORDER_FAILED_MESSAGE }),
    ]);
  });

  it('adds, renames and re-defaults levels after the server agrees', () => {
    loadLevels();

    store.create({ name: 'Urgent', color: '#C44536' }).subscribe();
    http
      .expectOne(URL)
      .flush({
        id: 14,
        name: 'Urgent',
        color: '#C44536',
        sortOrder: 3,
        isDefault: false,
        taskCount: 0,
      });
    expect(names()).toEqual(['Low', 'Medium', 'High', 'Urgent']);

    store.update(14, { name: 'Critical' }).subscribe();
    http
      .expectOne(`${URL}/14`)
      .flush({
        id: 14,
        name: 'Critical',
        color: '#C44536',
        sortOrder: 3,
        isDefault: false,
        taskCount: 0,
      });
    expect(names()).toEqual(['Low', 'Medium', 'High', 'Critical']);

    store.setDefault(14).subscribe();
    expect(store.defaultLevel().id).toBe(12);
    http.expectOne(`${URL}/14/default`).flush({ id: 14, isDefault: true });
    expect(store.defaultLevel().id).toBe(14);
    expect(store.levels().filter((level) => level.isDefault)).toHaveLength(1);
  });

  it('moves a deleted level’s tasks and default flag to the chosen level', () => {
    loadLevels();
    store.remove(12, 13).subscribe();
    http
      .expectOne((r) => r.url === `${URL}/12`)
      .flush({ deletedId: 12, reassignedTo: 13, tasksReassigned: 5 });

    expect(names()).toEqual(['Low', 'High']);
    expect(store.byId(13)).toMatchObject({ isDefault: true, taskCount: 6 });
  });

  it('leaves the levels alone when a delete fails', () => {
    loadLevels();
    store.remove(12, null).subscribe({ error: () => {} });
    http.expectOne(`${URL}/12`).flush({ error: 'In use' }, { status: 409, statusText: 'Conflict' });
    expect(names()).toEqual(['Low', 'Medium', 'High']);
  });

  it('goes back to the built-in levels on reset', () => {
    loadLevels();
    store.reset();
    expect(store.levels()).toEqual(BUILT_IN_PRIORITIES);
    expect(store.source()).toBe('built-in');
  });
});

describe('providePriorityLevels', () => {
  it('loads the levels when someone signs in and clears them on sign-out', () => {
    const currentUser = signal<SessionUser | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { currentUser } },
        providePriorityLevels(),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(PrioritiesStore);
    TestBed.tick();
    http.expectNone(URL);

    currentUser.set({
      id: 'user-1',
      username: 'mika',
      email: 'mika@example.com',
      timezone: 'Asia/Manila',
      inboxProjectId: 1,
    });
    TestBed.tick();
    http.expectOne(URL).flush(LEVELS);
    expect(store.source()).toBe('server');

    currentUser.set(null);
    TestBed.tick();
    expect(store.levels()).toEqual(BUILT_IN_PRIORITIES);
    http.verify();
  });
});
