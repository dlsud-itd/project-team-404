import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import {
  FONT_FAMILY_PROPERTY,
  FONT_SIZE_PROPERTY,
  SettingsStore,
  THEME_MODE_ATTRIBUTE,
} from '../state/settings.store';
import { clearSettingsCache } from '../testing/settings-cache';
import {
  DEFAULT_SETTINGS,
  THEME_COLOR_OPTIONS,
  type UserSettings,
} from '../types/user-settings.types';
import { PreferencesSettings } from './preferences-settings';

const URL = `${environment.apiBaseUrl}/api/settings`;
const SAVED: UserSettings = { ...DEFAULT_SETTINGS, fontSize: 'medium', fontFamily: 'system' };

describe('PreferencesSettings', () => {
  let fixture: ComponentFixture<PreferencesSettings>;
  let http: HttpTestingController;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector<T>(selector);
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (label: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === label,
    )!;
  const radios = () => [...page.querySelectorAll<HTMLInputElement>('input[name="font-size"]')];
  const radio = (value: string) => radios().find((r) => r.value === value)!;
  const select = () => el<HTMLSelectElement>('#font-family')!;
  const rootStyle = (name: string) => document.documentElement.style.getPropertyValue(name);

  function render(): void {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  }

  function pickSize(value: string): void {
    radio(value).click();
    render();
  }

  function pickFamily(value: string): void {
    select().value = value;
    select().dispatchEvent(new Event('change'));
    render();
  }

  function open(settings: UserSettings = SAVED): void {
    fixture = TestBed.createComponent(PreferencesSettings);
    page = fixture.nativeElement;
    render();
    http.expectOne(URL).flush(settings);
    render();
  }

  beforeEach(async () => {
    clearSettingsCache();
    await TestBed.configureTestingModule({
      imports: [PreferencesSettings],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    clearSettingsCache();
    document.documentElement.style.removeProperty(FONT_SIZE_PROPERTY);
    document.documentElement.style.removeProperty(FONT_FAMILY_PROPERTY);
    for (const { key } of THEME_COLOR_OPTIONS) {
      document.documentElement.style.removeProperty(`--theme-${key}`);
    }
    document.documentElement.removeAttribute(THEME_MODE_ATTRIBUTE);
  });

  it('offers font size as a four-way segmented control with the saved size picked', () => {
    open({ ...SAVED, fontSize: 'large' });

    expect(text('fieldset:has(input[name="font-size"]) legend')).toBe('Font size');
    expect(
      radios().map((input) => input.closest('.segment')?.querySelector('span')?.textContent),
    ).toEqual(['Small', 'Medium', 'Large', 'Extra large']);
    expect(radios().map((r) => r.checked)).toEqual([false, false, true, false]);
    expect(radio('large').closest('.segment')?.textContent?.trim()).toBe('Large');
  });

  it('offers the five fonts in a labelled select with the saved one picked', () => {
    open({ ...SAVED, fontFamily: 'serif' });

    expect(text('label[for="font-family"]')).toBe('Font');
    expect([...select().options].map((o) => o.textContent?.trim())).toEqual([
      'System',
      'Sans-serif',
      'Serif',
      'Monospace',
      'Atkinson Hyperlegible',
    ]);
    expect(select().value).toBe('serif');
  });

  it('switches modes, previews available presets and applies their colors', () => {
    open();
    const darkMode = page.querySelector<HTMLInputElement>(
      'input[name="theme-mode"][value="dark"]',
    )!;
    darkMode.click();
    render();

    const presets = [...page.querySelectorAll<HTMLButtonElement>('.preset-option')];
    expect(
      presets.map((preset) => preset.querySelector('.preset-name')?.textContent?.trim()),
    ).toEqual(['Midnight', 'Forest', 'Violet']);
    expect(presets[0].querySelector('.preset-preview')?.getAttribute('style')).toContain(
      'background-color: rgb(23, 25, 30)',
    );
    expect(document.documentElement.getAttribute(THEME_MODE_ATTRIBUTE)).toBe('dark');

    presets[1].click();
    render();
    expect(presets[1].getAttribute('aria-pressed')).toBe('true');
    expect(rootStyle('--theme-primary')).toBe('#8ed0a4');

    const primary = el<HTMLInputElement>('#color-primary')!;
    primary.value = '#226688';
    primary.dispatchEvent(new Event('input'));
    render();
    expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#226688');
    expect(text('.unsaved')).toBe('Unsaved changes');
  });

  it('applies a change to the whole app at once and in the preview', () => {
    open();
    pickSize('x-large');
    pickFamily('atkinson-hyperlegible');

    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('125%');
    expect(rootStyle(FONT_FAMILY_PROPERTY)).toContain('Atkinson Hyperlegible');
    expect(el<HTMLElement>('.preview-text')!.style.fontFamily).toContain('Atkinson Hyperlegible');
    expect(text('figcaption')).toBe('Preview · Extra large');
    expect(text('.unsaved')).toBe('Unsaved changes');
    // Nothing is saved yet.
    expect(TestBed.inject(SettingsStore).settings().fontSize).toBe('medium');
  });

  it('saves the choice', () => {
    open();
    expect(button('Save').disabled).toBe(true);
    pickSize('small');
    pickFamily('monospace');
    button('Save').click();
    render();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      fontSize: 'small',
      fontFamily: 'monospace',
      theme: DEFAULT_SETTINGS.theme,
    });
    req.flush({ ...SAVED, fontSize: 'small', fontFamily: 'monospace' });
    render();

    expect(text('[role="status"].form-notice')).toBe('Preferences saved.');
    expect(el('.unsaved')).toBeNull();
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('87.5%');

    // Leaving the page keeps the saved look.
    fixture.destroy();
    TestBed.tick();
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('87.5%');
  });

  it('reverts the page and the controls on Cancel', () => {
    open();
    pickSize('large');
    pickFamily('serif');
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('112.5%');

    button('Cancel').click();
    render();

    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('100%');
    expect(rootStyle(FONT_FAMILY_PROPERTY)).toContain('Archivo');
    expect(radio('medium').checked).toBe(true);
    expect(select().value).toBe('system');
    expect(button('Cancel').disabled).toBe(true);
  });

  it('drops an unsaved preview when the user leaves the page', () => {
    open();
    pickSize('x-large');
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('125%');

    fixture.destroy();
    TestBed.tick();
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('100%');
  });

  it('keeps the preview and shows an error when saving fails', () => {
    open();
    pickSize('large');
    button('Save').click();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    render();

    expect(text('p.alert[role="alert"]')).toBe("Couldn't save your preferences. Please try again.");
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('112.5%');
    expect(text('.unsaved')).toBe('Unsaved changes');
  });

  it('can’t save until the settings have loaded', () => {
    fixture = TestBed.createComponent(PreferencesSettings);
    page = fixture.nativeElement;
    render();
    http.expectOne(URL).flush(null, { status: 404, statusText: 'Not Found' });
    render();

    expect(text('div.alert')).toContain("Couldn't load your settings.");
    pickSize('large');
    expect(button('Save').disabled).toBe(true);
    // The preview still works, and Cancel still reverts it.
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('112.5%');
    button('Cancel').click();
    render();
    expect(rootStyle(FONT_SIZE_PROPERTY)).toBe('100%');
  });
});
