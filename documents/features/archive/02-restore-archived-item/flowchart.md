# 02. Restore an Archived Item

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## In simple terms

From the Archive page, the person restores a task, project, or label. The item returns to its active view, and the archive row/count is removed immediately. If the request fails, HabitFlow puts the row back.

## Flowchart

```mermaid
flowchart TD
    A[Person chooses Restore] --> B[Optimistically remove archive row]
    B --> C[PUT /api/{kind}/:id/archive isArchived=false]
    C --> D{Saved?}
    D -- Yes --> E[Update active store and counts]
    D -- No --> F[Restore archive row and show error]
```

## Data flow walkthrough

Each numbered item describes one file. Comments explain how the shared Archive service dispatches by item kind.

### 1. `frontend/src/app/features/archive/components/archive-page/archive-page.ts`

```ts
protected restore(item: ArchiveItem): void {
  const index = this.items().indexOf(item);
  // Hide the row optimistically; ArchiveUndoService restores it if the request fails.
  this.undo.restore(item, {
    announce: true,
    apply: () => this.removeRow(item),
    rollback: () => this.putBack(item, index),
  });
}
```

### 2. `frontend/src/app/features/archive/services/archive.service.ts`

```ts
restore(kind: ArchiveKind, id: number): Observable<void> {
  return this.setArchived(kind, id, false);
}
```

### 3. `frontend/src/app/features/archive/services/archive.service.ts`

```ts
// Projects already in the store use their optimistic project service; other kinds use the kind route.
const project = kind === 'project' ? this.projects.byId(id) : undefined;
const request = project
  ? this.projectOrganization.setArchived(project, isArchived)
  : this.http.put(`${this.api}/${PATH[kind]}/${id}/archive`, { isArchived });
```

### 4. `backend/src/features/tasks/task-organization/task-organization.routes.ts`

```ts
// Tasks restore through the task archive state endpoint with ownership middleware.
router.put(
  '/:taskId/archive',
  ...base,
  validateRequest(setTaskArchivedValidator, 'body', 'isArchived is required'),
  controller.archive
);
```

### 5. `backend/src/features/projects/project-organization/project-organization.routes.ts`

```ts
// Projects restore through the same endpoint used to archive them.
router.put(
  '/:projectId/archive',
  auth,
  validateProjectId,
  requireOwnedProject,
  validateRequest(setArchivedValidator, 'body', 'isArchived is required'),
  controller.archive
);
```

### 6. `backend/src/features/labels/label-organization/label-organization.routes.ts`

```ts
// Labels use their own owner-checked archive state endpoint.
router.put(
  '/:labelId/archive',
  requireAuth(sessionService),
  validateLabelId,
  captureLabelId,
  validateRequest(setLabelArchivedValidator, 'body', 'isArchived is required'),
  controller.archive
);
```

See [tests.md](tests.md) for restore coverage for all three item types.
