import { vi } from 'vitest';

// The first test in an integration spec also loads its lazy routes, which can pass Vitest's
// 5-second default while every spec file runs in parallel.
vi.setConfig({ testTimeout: 15_000 });

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(String(key), String(value));
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: new MemoryStorage(),
});
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: new MemoryStorage(),
});
