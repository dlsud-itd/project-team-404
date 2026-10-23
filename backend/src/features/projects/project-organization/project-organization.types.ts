import type { z } from 'zod';
import type { reorderProjectsValidator } from './validators/reorder-projects.validator';
import type { setArchivedValidator } from './validators/set-archived.validator';
import type { setFavoriteValidator } from './validators/set-favorite.validator';
import type { setSortOrderValidator } from './validators/set-sort-order.validator';

export type ReorderProjectsInput = z.infer<typeof reorderProjectsValidator>;
export type SetArchivedInput = z.infer<typeof setArchivedValidator>;
export type SetFavoriteInput = z.infer<typeof setFavoriteValidator>;
export type SetSortOrderInput = z.infer<typeof setSortOrderValidator>;

export type ProjectSortOrder = {
  projectId: number;
  sortOrder: number;
};
