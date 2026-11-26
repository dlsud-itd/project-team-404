# 03. Permanently Delete an Archived Item

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

## In simple terms

The person can permanently remove an archived item after confirming. The API delegates deletion to the item's owning feature: tasks and projects are soft-deleted (project tasks move to Inbox), while labels are deleted from the label table. The Archive row is then removed.

## Flowchart

```mermaid
flowchart TD
    A[Person chooses Delete permanently] --> B[Show confirmation dialog]
    B --> C{Confirm?}
    C -- No --> D[Keep item in Archive]
    C -- Yes --> E[DELETE /api/{kind}/:id]
    E --> F{Item kind}
    F -- Task --> G[Soft-delete task]
    F -- Project --> H[Soft-delete project and move tasks to Inbox]
    F -- Label --> I[Delete label row]
    G --> J[Remove Archive row]
    H --> J
    I --> J
```

## Data flow walkthrough

Each numbered item describes one file. Comments explain confirmation and kind-specific deletion.

### 1. `frontend/src/app/features/archive/components/archive-page/archive-page.ts`

```ts
protected confirmDelete(): void {
  const item = this.confirming();
  if (!item || this.deleting()) return;
  this.deleting.set(true);
  // Permanently delete only after confirmation, then remove the Archive row.
  this.archive.deletePermanently(item.kind, item.id).subscribe({
    next: () => {
      this.confirming.set(null);
      this.removeRow(item);
      this.toast.info(deletedToast(item.kind, item.name));
    },
    error: () => this.deleteError.set(deleteFailedToast(item.kind, item.name)),
  });
}
```

### 2. `frontend/src/app/features/archive/services/archive.service.ts`

```ts
deletePermanently(kind: ArchiveKind, id: number): Observable<void> {
  // Route to the owning feature's delete endpoint based on item type.
  return this.http.delete(`${this.api}/${PATH[kind]}/${id}`).pipe(
    tap(() => {
      if (kind === 'task') this.tasks.remove(id);
      else if (kind === 'project') this.projects.remove(id);
      else this.labelChanges.next({ labelId: id, isArchived: true, deleted: true });
    }),
    map(() => undefined),
  );
}
```

### 3. `backend/src/features/tasks/task-crud/db/queries/soft-delete-task.query.ts`

```ts
// Tasks are soft-deleted so their records can remain for history/relationships.
await prisma.task.updateMany({
  where: { id: taskId, userId, deletedAt: null },
  data: { deletedAt: new Date() },
});
```

### 4. `backend/src/features/projects/project-crud/db/queries/soft-delete-owned-project.query.ts`

```ts
// Projects are soft-deleted; active tasks are moved to the owner's Inbox in the same transaction.
return prisma.$transaction(async (transaction) => {
  const updatedAt = new Date();
  // Mark the owned project deleted, then load this owner's Inbox.
  const result = await transaction.project.updateMany({
    where: { id: projectId, userId, deletedAt: null, isInbox: false },
    data: { deletedAt: updatedAt, updatedAt },
  });
  if (result.count === 0) return null;
  const inbox = await transaction.project.findFirst({
    where: { userId, isInbox: true, deletedAt: null },
    select: { id: true },
  });
  if (!inbox) throw new Error('Inbox project not found for owner');
  // Move active tasks to the Inbox and return the moved count.
  const movedTasks = await transaction.task.updateMany({
    where: { projectId, userId, deletedAt: null },
    data: { projectId: inbox.id, updatedAt },
  });
  return movedTasks.count;
});
```

### 5. `backend/src/features/labels/label-crud/db/queries/delete-label.query.ts`

```ts
// Unlike tasks/projects, deleting a label removes its owner-scoped row.
const result = await prisma.label.deleteMany({
  where: { id: labelId, userId },
});
return result.count > 0;
```

See [tests.md](tests.md) for confirmation and per-kind deletion behavior.
