import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { LabelManagement } from './label-management';

const LABELS_URL = `${environment.apiBaseUrl}/api/labels`;

describe('LabelManagement', () => {
  let fixture: ComponentFixture<LabelManagement>;
  let http: HttpTestingController;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelManagement],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LabelManagement);
    page = fixture.nativeElement;
    fixture.detectChanges();
    http.expectOne(LABELS_URL).flush([]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('creates a label and reports duplicate names', () => {
    const name = el<HTMLInputElement>('#label-name');
    name.value = 'Study';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));

    const request = http.expectOne(LABELS_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Study', color: '#2563EB' });
    request.flush(
      { id: 8, name: 'Study', color: '#2563EB' },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();
    expect(page.textContent).toContain('Study');

    name.value = 'Study';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    http
      .expectOne(LABELS_URL)
      .flush(
        { code: 'label-name-taken', error: 'A label with this name already exists.' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'A label with this name already exists.',
    );
  });

  it('updates and deletes a label only after confirmation', () => {
    el<HTMLInputElement>('#label-name').value = 'Study';
    el<HTMLInputElement>('#label-name').dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    http
      .expectOne(LABELS_URL)
      .flush({ id: 8, name: 'Study', color: '#2563EB' }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    el<HTMLButtonElement>('button[aria-label="Edit Study"]')?.click();
    fixture.detectChanges();

    el<HTMLInputElement>('#label-name').value = 'Reading';
    el<HTMLInputElement>('#label-name').dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    const update = http.expectOne(`${LABELS_URL}/8`);
    expect(update.request.method).toBe('PUT');
    update.flush({ id: 8, name: 'Reading', color: '#2563EB' });
    fixture.detectChanges();

    el<HTMLButtonElement>('button[aria-label="Delete Reading"]')?.click();
    fixture.detectChanges();
    expect(page.querySelector('[role="dialog"]')).toBeTruthy();
    http.expectNone(`${LABELS_URL}/8`);
    el<HTMLButtonElement>('[role="dialog"] button')?.click();
    const remove = http.expectOne(`${LABELS_URL}/8`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(page.textContent).not.toContain('Reading');
  });
});
