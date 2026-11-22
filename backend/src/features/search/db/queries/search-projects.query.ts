import { prisma } from '../../../../shared/db/prisma.client';
import type {
  SearchPage,
  SearchProjectRecord,
} from '../../types/search-result.types';
import { toSearchProjectResult } from '../../models/search-result.model';
import { escapeLikeLiteral } from '../../utils/escape-like-literal.util';
import { rankSearchResults, SEARCH_RANK } from '../../utils/rank-results.util';

type SearchProjectRow = SearchProjectRecord;
type CountRow = { total: number };

export async function searchProjects(
  userId: string,
  q: string,
  limit: number,
  includeArchived: boolean
): Promise<SearchPage<ReturnType<typeof toSearchProjectResult>>> {
  const escaped = escapeLikeLiteral(q);
  const exactPattern = escaped;
  const prefixPattern = `${escaped}%`;
  const containsPattern = `%${escaped}%`;
  const [items, [count]] = await Promise.all([
    prisma.$queryRaw<SearchProjectRow[]>`
      select
        project.project_id as id,
        project.name,
        case
          when project.name ilike ${containsPattern} escape chr(92) then 'name'
          else 'description'
        end as "matchedField",
        case
          when project.name ilike ${containsPattern} escape chr(92)
            then left(project.name, 120)
          else substring(
            project.description
            from greatest(
              1,
              position(lower(${q}) in lower(project.description)) - 40
            )
            for 120
          )
        end as snippet,
        project.is_archived as "isArchived",
        project.archived_at as "archivedAt",
        project.updated_at as "updatedAt"
      from public.tbl_project as project
      where project.user_id = ${userId}::uuid
        and project.deleted_at is null
        and (
          project.name ilike ${containsPattern} escape chr(92)
          or project.description ilike ${containsPattern} escape chr(92)
        )
        and (
          ${includeArchived}::boolean
          or (not project.is_archived and project.archived_at is null)
        )
      order by
        case
          when project.name ilike ${exactPattern} escape chr(92)
            then ${SEARCH_RANK.exact}
          when project.name ilike ${prefixPattern} escape chr(92)
            then ${SEARCH_RANK.startsWith}
          else ${SEARCH_RANK.contains}
        end,
        project.updated_at desc,
        project.project_id desc
      limit ${limit}
    `,
    prisma.$queryRaw<CountRow[]>`
      select count(*)::int as total
      from public.tbl_project as project
      where project.user_id = ${userId}::uuid
        and project.deleted_at is null
        and (
          project.name ilike ${containsPattern} escape chr(92)
          or project.description ilike ${containsPattern} escape chr(92)
        )
        and (
          ${includeArchived}::boolean
          or (not project.is_archived and project.archived_at is null)
        )
    `,
  ]);
  return {
    items: rankSearchResults(items, q, ({ name }) => name).map(
      toSearchProjectResult
    ),
    total: count?.total ?? 0,
  };
}
