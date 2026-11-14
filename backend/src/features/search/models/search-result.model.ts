import type {
  SearchProjectItem,
  SearchProjectRecord,
  SearchTaskItem,
  SearchTaskRecord,
} from '../types/search-result.types';

export function toSearchTaskResult(record: SearchTaskRecord): SearchTaskItem {
  return {
    id: record.id,
    title: record.title,
    projectId: record.projectId,
    matchedField: record.matchedField,
    snippet: record.snippet,
    isArchived: record.isArchived,
    archivedAt: record.archivedAt,
  };
}

export function toSearchProjectResult(
  record: SearchProjectRecord
): SearchProjectItem {
  return {
    id: record.id,
    name: record.name,
    matchedField: record.matchedField,
    snippet: record.snippet,
    isArchived: record.isArchived,
    archivedAt: record.archivedAt,
  };
}
