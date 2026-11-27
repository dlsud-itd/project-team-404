import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ViewSwitcher, toTaskView } from './view-switcher';

describe('ViewSwitcher', () => {
  let fixture: ComponentFixture<ViewSwitcher>;

  const links = () => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'),
  ];

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    await TestBed.inject(Router).navigateByUrl('/?tab=tasks&status=active');
    fixture = TestBed.createComponent(ViewSwitcher);
  });

  afterEach(() => fixture.destroy());

  it('links to List, Table, Board and Timeline, keeping the other parameters', () => {
    fixture.componentRef.setInput('view', 'table');
    fixture.detectChanges();

    expect(links().map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['List', '/?tab=tasks&status=active&view=list'],
      ['Table', '/?tab=tasks&status=active&view=table'],
      ['Board', '/?tab=tasks&status=active&view=board'],
      ['Timeline', '/?tab=tasks&status=active&view=timeline'],
    ]);
    expect(fixture.nativeElement.querySelector('nav').getAttribute('aria-label')).toBe(
      'Task views',
    );
  });

  it('marks the current view', () => {
    fixture.componentRef.setInput('view', 'board');
    fixture.detectChanges();

    expect(links().map((a) => a.getAttribute('aria-current'))).toEqual([null, null, 'page', null]);
  });

  it('navigates when a view is picked', async () => {
    fixture.componentRef.setInput('view', 'list');
    fixture.detectChanges();

    links()[1].click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/?tab=tasks&status=active&view=table');
  });

  it('can use another parameter name and offer fewer views', () => {
    fixture.componentRef.setInput('view', 'list');
    fixture.componentRef.setInput('param', 'taskView');
    fixture.componentRef.setInput('views', ['timeline', 'list', 'board']);
    fixture.detectChanges();

    // Always in the usual order, whatever order the page lists them in.
    expect(links().map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['List', '/?tab=tasks&status=active&taskView=list'],
      ['Board', '/?tab=tasks&status=active&taskView=board'],
      ['Timeline', '/?tab=tasks&status=active&taskView=timeline'],
    ]);
  });

  it('reads a view without a table from a parameter', () => {
    expect([null, 'list', 'board', 'timeline', 'table', 'x'].map(toTaskView)).toEqual([
      'list',
      'list',
      'board',
      'timeline',
      'list',
      'list',
    ]);
  });
});
