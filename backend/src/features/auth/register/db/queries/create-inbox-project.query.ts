import { prisma } from '../../../../../shared/db/prisma.client';

export async function createInboxProject(userId: string): Promise<number> {
  const project = await prisma.project.create({
    data: { userId, name: 'Inbox', isInbox: true },
    select: { id: true },
  });
  return project.id;
}
