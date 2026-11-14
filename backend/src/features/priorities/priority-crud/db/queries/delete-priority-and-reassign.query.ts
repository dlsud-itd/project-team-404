import { prisma } from '../../../../../shared/db/prisma.client';
import { ReassignRequiredError } from '../../errors/reassign-required.error';
import { LastPriorityError } from '../../errors/last-priority.error';

export async function deletePriorityAndReassign(
  priorityId: number,
  userId: string,
  query: { reassignTo?: number }
) {
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.priorityLevel.findFirst({
      where: { id: priorityId, userId, deletedAt: null },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
    if (!current) return null;

    const active = await transaction.priorityLevel.findMany({
      where: { userId, deletedAt: null },
    });
    if (active.length <= 1) {
      throw new LastPriorityError();
    }

    const mustReassign = current._count.tasks > 0 || current.isDefault;
    if (mustReassign && !query.reassignTo) {
      throw new ReassignRequiredError();
    }
    const reassignTarget = query.reassignTo
      ? active.find(
          (item: { id: number }) =>
            item.id === query.reassignTo && item.id !== priorityId
        )
      : undefined;
    if (mustReassign && !reassignTarget) {
      throw new ReassignRequiredError();
    }

    if (current._count.tasks > 0) {
      if (!reassignTarget) {
        throw new ReassignRequiredError();
      }
      await transaction.task.updateMany({
        where: { userId, priorityId, deletedAt: null },
        data: { priorityId: reassignTarget.id },
      });
    }

    if (current.isDefault) {
      if (!reassignTarget) {
        throw new ReassignRequiredError();
      }
      await transaction.priorityLevel.update({
        where: { id: priorityId },
        data: { isDefault: false },
      });
      await transaction.priorityLevel.update({
        where: { id: reassignTarget.id },
        data: { isDefault: true },
      });
    }

    return transaction.priorityLevel.update({
      where: { id: priorityId },
      data: { deletedAt: new Date(), isDefault: false },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  });
}
