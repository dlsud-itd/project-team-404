import { prisma } from '../../../../../shared/db/prisma.client';
import type { CreateProjectInput } from '../../project-crud.types';

export async function createProject(userId: string, input: CreateProjectInput) {
  return prisma.project.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      color: input.color,
    },
  });
}
