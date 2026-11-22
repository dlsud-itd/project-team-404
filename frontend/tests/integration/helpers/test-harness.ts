import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

export type TestHarnessOptions<T> = {
  imports?: Array<Type<unknown> | any>;
  providers?: unknown[];
  componentProviders?: unknown[];
};

export type TestHarnessResult<T> = {
  fixture: any;
  componentInstance: T;
};

export async function createTestHarness<T>(
  component: Type<T>,
  options: TestHarnessOptions<T> = {},
): Promise<TestHarnessResult<T>> {
  await TestBed.configureTestingModule({
    imports: options.imports ?? [],
    providers: [...(options.providers ?? []), ...(options.componentProviders ?? [])],
  }).compileComponents();

  const fixture = TestBed.createComponent(component);

  return {
    fixture,
    componentInstance: fixture.componentInstance,
  };
}
