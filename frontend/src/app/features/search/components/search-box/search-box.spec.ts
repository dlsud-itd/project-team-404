import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  type TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ProjectsStore } from '../../../projects/shared/state/projects.store';
import { SEARCH_DEBOUNCE_MS } from '../../services/search.service';
import type { ApiSearchResponse } from '../../types/search.types';
import { SearchBox } from './search-box';

const API = `${environment.apiBaseUrl}/api`;

function response(): ApiSearchResponse {
  return {
    tasks: {
      items: [
        {
          id: 9,
          title: 'Buy milk',
          projectId: 5,
          matchedField: 'title',
          snippet: 'Buy milk',
          isArchived: false,
          archivedAt: null,
        },
      ],
      total: 1,
    },
    projects: {
      items: [
        {
          id: 5,
          name: 'Milk run',
          matchedField: 'name',
          snippet: 'Milk run',
          isArchived: false,
          archivedAt: null,
        },
      ],
      total: 1,
    },
  };
}

describe('SearchBox', () => {
  let fixture: ComponentFixture<SearchBox>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  let el: HTMLElement;
  let input: HTMLInputElement;

  const searches = () => http.match((r) => r.url === `${API}/search`);
  const options = () => [...el.querySelectorAll<HTMLElement>('[role="option"]')];

  function type(value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function key(name: string, init: KeyboardEventInit = {}, target: EventTarget = input): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, ...init }));
    fixture.detectChanges();
  }

  function wait(ms = SEARCH_DEBOUNCE_MS): void {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  }

  function flush(req: TestRequest): void {
    req.flush(response());
    fixture.detectChanges();
  }

  /** Types a query, waits out the pause and answers it. */
  function searchFor(value: string): void {
    input.focus();
    type(value);
    wait();
    const [req] = searches();
    flush(req);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(ProjectsStore).setProjects([]);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(SearchBox);
    el = fixture.nativeElement;
    document.body.appendChild(el);
    fixture.detectChanges();
    input = el.querySelector('input[role="combobox"]')!;
  });

  afterEach(() => {
    http.verify();
    el.remove();
    vi.useRealTimers();
  });

  it('waits for a pause in typing before searching', () => {
    input.focus();
    type('mi');
    type('mil');
    wait(SEARCH_DEBOUNCE_MS - 1);
    expect(searches()).toHaveLength(0);
    type('milk');
    wait();
    const reqs = searches();
    expect(reqs).toHaveLength(1);
    expect(reqs[0].request.params.get('q')).toBe('milk');
    flush(reqs[0]);
  });

  it('does not search for fewer than two characters', () => {
    input.focus();
    type('m');
    wait();
    expect(searches()).toHaveLength(0);
    expect(el.querySelector('.panel')).toBeNull();
  });

  it('cancels the request for an older query', () => {
    input.focus();
    type('mi');
    wait();
    const [old] = searches();
    type('milk');
    wait();
    expect(old.cancelled).toBe(true);
    const [latest] = searches();
    flush(latest);
    expect(options()).toHaveLength(2);
  });

  it('shows loading, then the results', () => {
    input.focus();
    type('milk');
    wait();
    expect(el.querySelector('.panel [role="status"]')?.textContent).toContain('Searching');
    expect(input.getAttribute('aria-busy')).toBe('true');
    flush(searches()[0]);
    expect(options().map((o) => o.querySelector('.title')?.textContent?.trim())).toEqual([
      'Buy milk',
      'Milk run',
    ]);
  });

  it('shows an error and retries', () => {
    input.focus();
    type('milk');
    wait();
    searches()[0].flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain("Search isn't working");
    el.querySelector<HTMLButtonElement>('.retry')!.click();
    wait(0);
    flush(searches()[0]);
    expect(options()).toHaveLength(2);
  });

  it('follows the ARIA combobox pattern', () => {
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.hasAttribute('aria-controls')).toBe(false);
    searchFor('milk');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe('global-search-listbox');
    expect(el.querySelector('#global-search-listbox')?.getAttribute('role')).toBe('listbox');
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('moves through options with the arrow keys, wrapping around', () => {
    searchFor('milk');
    key('ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe('global-search-task-9');
    key('ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe('global-search-project-5');
    key('ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe('global-search-task-9');
    key('ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe('global-search-project-5');
    expect(options()[1].getAttribute('aria-selected')).toBe('true');
  });

  it('opens the active option with Enter', () => {
    searchFor('milk');
    key('ArrowDown');
    key('Enter');
    expect(navigate).toHaveBeenCalledWith(['/projects', 5, 'tasks', 9, 'edit']);
    expect(el.querySelector('.panel')).toBeNull();
  });

  it('opens the search page with Enter when no option is active', () => {
    searchFor('milk');
    key('Enter');
    expect(navigate).toHaveBeenCalledWith(['/search'], {
      queryParams: { q: 'milk', archived: null },
    });
  });

  it('closes with Escape, then leaves the field on a second Escape', () => {
    searchFor('milk');
    key('Escape');
    expect(el.querySelector('.panel')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(input);
    key('Escape');
    expect(document.activeElement).not.toBe(input);
  });

  it('searches again straight away when archived items are included', () => {
    searchFor('milk');
    el.querySelector<HTMLInputElement>('.archived-toggle input')!.click();
    fixture.detectChanges();
    wait(0);
    const [req] = searches();
    expect(req.request.params.get('includeArchived')).toBe('true');
    flush(req);
  });

  it('focuses on Ctrl+K, Cmd+K and / from anywhere', () => {
    key('k', { ctrlKey: true }, document);
    expect(document.activeElement).toBe(input);
    input.blur();
    key('k', { metaKey: true }, document);
    expect(document.activeElement).toBe(input);
    input.blur();
    key('/', {}, document.body);
    expect(document.activeElement).toBe(input);
  });

  it('leaves / alone while typing in another field', () => {
    const other = document.createElement('textarea');
    document.body.appendChild(other);
    other.focus();
    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    other.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(other);
    other.remove();
  });
});
