export type TaskPositionUpdate = {
  taskId: number;
  position: number;
};

export function reorderTasks(taskIds: number[]): TaskPositionUpdate[] {
  return taskIds.map((taskId, index) => ({ taskId, position: index + 1 }));
}
