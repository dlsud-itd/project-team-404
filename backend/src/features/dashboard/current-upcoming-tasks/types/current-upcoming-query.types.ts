import type { z } from 'zod';
import type { currentUpcomingQueryValidator } from '../validators/current-upcoming-query.validator';

export type CurrentUpcomingQuery = z.infer<
  typeof currentUpcomingQueryValidator
>;
