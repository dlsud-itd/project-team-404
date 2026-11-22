import { prisma } from '../../../../shared/db/prisma.client';
import type {
  SearchPage,
  SearchTaskRecord,
} from '../../types/search-result.types';
import { toSearchTaskResult } from '../../models/search-result.model';
import { escapeLikeLiteral } from '../../utils/escape-like-literal.util';
import { rankSearchResults, SEARCH_RANK } from '../../utils/rank-results.util';

type SearchTaskRow = SearchTaskRecord;
type CountRow = { total: number };

export async function searchTasks(
  userId: string,
  q: string,
  limit: number,
  includeArchived: boolean
): Promise<SearchPage<ReturnType<typeof toSearchTaskResult>>> {
  const escaped = escapeLikeLiteral(q);
  const exactPattern = escaped;
  const prefixPattern = `${escaped}%`;
  const containsPattern = `%${escaped}%`;
  const [items, [count]] = await Promise.all([
    prisma.$queryRaw<SearchTaskRow[]>`
      select
        task.task_id as id,
        task.title,
        task.project_id as "projectId",
        case
          when task.title ilike ${containsPattern} escape chr(92) then 'title'
          else 'description'
        end as "matchedField",
        case
          when task.title ilike ${containsPattern} escape chr(92)
            then left(task.title, 120)
          else substring(
            task.description
            from greatest(
              1,
              position(lower(${q}) in lower(task.description)) - 40
            )
            for 120
          )
        end as snippet,
        (task.archived_at is not null) as "isArchived",
        task.archived_at as "archivedAt",
        task.updated_at as "updatedAt"
      from public.tbl_task as task
      left join public.tbl_project as project
        on project.project_id = task.project_id
        and project.user_id = task.user_id
      where task.user_id = ${userId}::uuid
        and task.deleted_at is null
        and (
          task.title ilike ${containsPattern} escape chr(92)
          or task.description ilike ${containsPattern} escape chr(92)
        )
        and (
          task.project_id is null
          or (project.project_id is not null and project.deleted_at is null)
        )
        and (
          ${includeArchived}::boolean
          or (
            task.archived_at is null
            and (task.project_id is null or not project.is_archived)
          )
        )
      order by
        case
          when task.title ilike ${exactPattern} escape chr(92)
            then ${SEARCH_RANK.exact}
          when task.title ilike ${prefixPattern} escape chr(92)
            then ${SEARCH_RANK.startsWith}
          else ${SEARCH_RANK.contains}
        end,
        task.updated_at desc,
        task.task_id desc
      limit ${limit}
    `,
    prisma.$queryRaw<CountRow[]>`
      select count(*)::int as total
      from public.tbl_task as task
      left join public.tbl_project as project
        on project.project_id = task.project_id
        and project.user_id = task.user_id
      where task.user_id = ${userId}::uuid
        and task.deleted_at is null
        and (
          task.title ilike ${containsPattern} escape chr(92)
          or task.description ilike ${containsPattern} escape chr(92)
        )
        and (
          task.project_id is null
          or (project.project_id is not null and project.deleted_at is null)
        )
        and (
          ${includeArchived}::boolean
          or (
            task.archived_at is null
            and (task.project_id is null or not project.is_archived)
          )
        )
    `,
  ]);
  return {
    items: rankSearchResults(items, q, ({ title }) => title).map(
      toSearchTaskResult
    ),
    total: count?.total ?? 0,
  };
}
