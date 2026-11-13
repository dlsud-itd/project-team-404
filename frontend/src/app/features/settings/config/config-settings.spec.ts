import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { SettingsStore } from '../state/settings.store';
import { clearSettingsCache } from '../testing/settings-cache';
import { DEFAULT_SETTINGS, type UserSettings } from '../types/user-settings.types';
import { ConfigSettings } from './config-settings';

const URL = `${environment.apiBaseUrl}/api/settings`;
const SAVED: UserSettings = {
  ...DEFAULT_SETTINGS,
  dashboardTaskLimit: 8,
  dashboardProjectLimit: 3,
};

describe('ConfigSettings', () => {
  let fixture: ComponentFixture<ConfigSettings>;
  let http: HttpTestingController;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector<T>(selector);
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (label: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
    )!;
  const tasks = () => el<HTMLInputElement>('#dashboard-task-limit')!;
  const projects = () => el<HTMLInputElement>('#dashboard-project-limit')!;

  function render(): void {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    render();
  }

  function open(settings: UserSettings = SAVED): void {
    fixture = TestBed.createComponent(ConfigSettings);
    page = fixture.nativeElement;
    render();
    http.expectOne(URL).flush(settings);
    render();
  }

  beforeEach(async () => {
    clearSettingsCache();
    await TestBed.configureTestingModule({
      imports: [ConfigSettings],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    clearSettingsCache();
  });

  it('shows both limits as labelled number fields filled with the saved values', () => {
    open();

    expect(text('label[for="dashboard-task-limit"]')).toBe('Tasks per dashboard widget');
    expect(text('label[for="dashboard-project-limit"]')).toBe(
      'Projects in the dashboard project list',
    );
    expect(tasks().type).toBe('number');
    expect(tasks().min).toBe('1');
    expect(tasks().max).toBe('50');
    expect(tasks().value).toBe('8');
    expect(projects().value).toBe('3');
    expect(tasks().getAttribute('aria-describedby')).toBe(
      'dashboard-task-limit-hint dashboard-task-limit-error',
    );
    expect(text('#dashboard-task-limit-hint')).toContain('1–50');
  });

  it('explains where the limits apply', () => {
    open();
    expect(text('.note')).toContain('Dashboard page and the Home dashboard');
    expect(text('#dashboard-project-limit-hint')).toContain('Projects list in the home sidebar');
  });

  it('steps a value with the − and + buttons, staying within 1–50', () => {
    open({ ...SAVED, dashboardTaskLimit: 2, dashboardProjectLimit: 49 });

    button('Decrease tasks per dashboard widget').click();
    render();
    expect(tasks().value).toBe('1');
    expect(button('Decrease tasks per dashboard widget').disabled).toBe(true);

    button('Increase projects in the dashboard project list').click();
    render();
    expect(projects().value).toBe('50');
    expect(button('Increase projects in the dashboard project list').disabled).toBe(true);
  });

  it('shows validation messages and blocks Save for out-of-range or missing values', () => {
    open();
    const save = () => button('Save');

    type(tasks(), '0');
    expect(text('#dashboard-task-limit-error')).toBe('Choose a number from 1 to 50.');
    expect(tasks().getAttribute('aria-invalid')).toBe('true');
    expect(save().disabled).toBe(true);

    type(tasks(), '51');
    expect(text('#dashboard-task-limit-error')).toBe('Choose a number from 1 to 50.');

    type(tasks(), '');
    expect(text('#dashboard-task-limit-error')).toBe('Enter a number.');

    type(tasks(), '2.5');
    expect(text('#dashboard-task-limit-error')).toBe('Use a whole number.');

    type(tasks(), '12');
    expect(text('#dashboard-task-limit-error')).toBe('');
    expect(save().disabled).toBe(false);
  });

  it('keeps Save off until a value changes', () => {
    open();
    expect(button('Save').disabled).toBe(true);
    type(projects(), '3');
    expect(button('Save').disabled).toBe(true);
  });

  it('saves the limits and confirms', () => {
    open();
    type(tasks(), '12');
    el<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    render();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ dashboardTaskLimit: 12, dashboardProjectLimit: 3 });
    expect(button('Saving…').disabled).toBe(true);
    req.flush({ ...SAVED, dashboardTaskLimit: 12 });
    render();

    expect(text('[role="status"]')).toBe('Dashboard limits saved.');
    expect(TestBed.inject(SettingsStore).taskLimit()).toBe(12);
    expect(button('Save').disabled).toBe(true);
  });

  it('shows an error and keeps the edit when saving fails', () => {
    open();
    type(tasks(), '12');
    button('Save').click();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    render();

    expect(text('[role="alert"]')).toBe("Couldn't save your limits. Please try again.");
    expect(tasks().value).toBe('12');
    expect(TestBed.inject(SettingsStore).taskLimit()).toBe(8);
  });

  it('resets both limits to the defaults', () => {
    open();
    button('Reset to defaults').click();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ dashboardTaskLimit: 5, dashboardProjectLimit: 5 });
    req.flush(DEFAULT_SETTINGS);
    render();

    expect(tasks().value).toBe('5');
    expect(projects().value).toBe('5');
    expect(text('[role="status"]')).toBe('Limits reset to the defaults.');
    expect(button('Reset to defaults').disabled).toBe(true);
  });

  it('offers a retry and disables saving when the settings fail to load', () => {
    fixture = TestBed.createComponent(ConfigSettings);
    page = fixture.nativeElement;
    render();
    http.expectOne(URL).flush(null, { status: 404, statusText: 'Not Found' });
    render();

    expect(text('[role="alert"]')).toContain("Couldn't load your settings.");
    type(tasks(), '9');
    expect(button('Save').disabled).toBe(true);
    expect(button('Reset to defaults').disabled).toBe(true);

    button('Try again').click();
    http.expectOne(URL).flush(SAVED);
    render();
    expect(el('[role="alert"]')).toBeNull();
    expect(button('Save').disabled).toBe(false);
  });
});
