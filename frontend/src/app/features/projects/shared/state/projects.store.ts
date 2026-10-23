import { Injectable, computed, signal } from '@angular/core';
import type { Project } from '../types/project.types';

/** Inbox first, then by sortOrder, then by id so the order is stable. */
function byDisplayOrder(a: Project, b: Project): number {
  return (
    Number(b.isInbox) - Number(a.isInbox) || a.sortOrder - b.sortOrder || a.projectId - b.projectId
  );
}

/**
 * The signed-in user's projects, shared by every projects subfeature. It only holds state;
 * the services that call the API write to it.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsStore {
  private readonly list = signal<Project[]>([]);

  readonly projects = computed(() => [...this.list()].sort(byDisplayOrder));
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** True once a list request has succeeded. */
  readonly loaded = signal(false);

  readonly inbox = computed(() => this.projects().find((p) => p.isInbox) ?? null);
  /** Projects shown in the main list: not archived, Inbox first. */
  readonly active = computed(() => this.projects().filter((p) => !p.isArchived));

  byId(projectId: number): Project | undefined {
    return this.list().find((p) => p.projectId === projectId);
  }

  startLoading(): void {
    this.loading.set(true);
    this.error.set(null);
  }

  setProjects(projects: Project[]): void {
    this.list.set(projects);
    this.loading.set(false);
    this.loaded.set(true);
  }

  fail(message: string): void {
    this.loading.set(false);
    this.error.set(message);
  }

  /** Adds a project, or replaces the one with the same id. */
  upsert(project: Project): void {
    this.list.update((list) =>
      list.some((p) => p.projectId === project.projectId)
        ? list.map((p) => (p.projectId === project.projectId ? project : p))
        : [...list, project],
    );
  }

  patch(projectId: number, changes: Partial<Project>): void {
    this.list.update((list) =>
      list.map((p) => (p.projectId === projectId ? { ...p, ...changes, projectId } : p)),
    );
  }

  remove(projectId: number): void {
    this.list.update((list) => list.filter((p) => p.projectId !== projectId));
  }

  /** Forgets everything, e.g. when the user logs out. */
  reset(): void {
    this.list.set([]);
    this.loading.set(false);
    this.loaded.set(false);
    this.error.set(null);
  }
}
