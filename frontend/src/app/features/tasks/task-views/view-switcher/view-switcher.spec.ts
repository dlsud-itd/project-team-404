import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ViewSwitcher } from './view-switcher';

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

  it('links to each view, keeping the other parameters, and marks the current one', () => {
    fixture.componentRef.setInput('view', 'board');
    fixture.detectChanges();

    expect(links().map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['List', '/?tab=tasks&status=active'],
      ['Board', '/?tab=tasks&status=active&view=board'],
    ]);
    expect(links().map((a) => a.getAttribute('aria-current'))).toEqual([null, 'page']);
  });

  it('can use another parameter name', () => {
    fixture.componentRef.setInput('view', 'list');
    fixture.componentRef.setInput('param', 'taskView');
    fixture.detectChanges();

    expect(links()[1].getAttribute('href')).toBe('/?tab=tasks&status=active&taskView=board');
    expect(fixture.nativeElement.querySelector('nav').getAttribute('aria-label')).toBe(
      'Task views',
    );
  });
});
