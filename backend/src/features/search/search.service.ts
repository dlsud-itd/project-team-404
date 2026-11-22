import { searchProjects } from './db/queries/search-projects.query';
import { searchTasks } from './db/queries/search-tasks.query';
import type {
  SearchPage,
  SearchProjectItem,
  SearchQuery,
  SearchResponse,
  SearchTaskItem,
} from './types/search-result.types';

export type SearchDependencies = {
  searchTasks(
    userId: string,
    q: string,
    limit: number,
    includeArchived: boolean
  ): Promise<SearchPage<SearchTaskItem>>;
  searchProjects(
    userId: string,
    q: string,
    limit: number,
    includeArchived: boolean
  ): Promise<SearchPage<SearchProjectItem>>;
};

const emptyTasks: SearchPage<SearchTaskItem> = { items: [], total: 0 };
const emptyProjects: SearchPage<SearchProjectItem> = { items: [], total: 0 };

export class SearchService {
  constructor(
    private readonly dependencies: SearchDependencies = {
      searchTasks,
      searchProjects,
    }
  ) {}

  async search(userId: string, query: SearchQuery): Promise<SearchResponse> {
    const [tasks, projects] = await Promise.all([
      query.type === 'all' || query.type === 'tasks'
        ? this.dependencies.searchTasks(
            userId,
            query.q,
            query.limit,
            query.includeArchived
          )
        : Promise.resolve(emptyTasks),
      query.type === 'all' || query.type === 'projects'
        ? this.dependencies.searchProjects(
            userId,
            query.q,
            query.limit,
            query.includeArchived
          )
        : Promise.resolve(emptyProjects),
    ]);

    return { tasks, projects };
  }
}
