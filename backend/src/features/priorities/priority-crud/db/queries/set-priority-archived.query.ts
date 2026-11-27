import { prisma } from '../../../../../shared/db/prisma.client';
import { DefaultPriorityArchiveError } from '../../errors/default-priority-archive.error';
import { LastPriorityError } from '../../errors/last-priority.error';

/**
 * Archives or restores a level. The default level, and the last level that is still active,
 * can't be archived. Returns null when the level doesn't exist or isn't the user's.
 */
export async function setPriorityArchived(
  priorityId: number,
  userId: string,
  isArchived: boolean
) {
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.priorityLevel.findFirst({
      where: { id: priorityId, userId, deletedAt: null },
    });
    if (!current) return null;

    if (isArchived && current.archivedAt === null) {
      if (current.isDefault) throw new DefaultPriorityArchiveError();
      const othersActive = await transaction.priorityLevel.count({
        where: {
          userId,
          deletedAt: null,
          archivedAt: null,
          id: { not: priorityId },
        },
      });
      if (othersActive === 0) throw new LastPriorityError();
    }

    return transaction.priorityLevel.update({
      where: { id: priorityId },
      data: {
        // Archiving twice keeps the first timestamp, so the Archive page order stays put.
        archivedAt: isArchived ? (current.archivedAt ?? new Date()) : null,
      },
      include: { _count: { select: { tasks: true } } },
    });
  });
}
