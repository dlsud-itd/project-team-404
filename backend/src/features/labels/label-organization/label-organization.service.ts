import { LabelNotFoundError } from '../label-crud/errors/label-not-found.error';
import type { LabelListRecord } from '../shared/models/label.model';
import { toLabelModel } from '../shared/models/label.model';

export type LabelOrganizationDependencies = {
  setLabelArchived(
    labelId: number,
    userId: string,
    isArchived: boolean
  ): Promise<LabelListRecord | null>;
};

export class LabelOrganizationService {
  constructor(private readonly dependencies: LabelOrganizationDependencies) {}

  async setArchived(labelId: number, userId: string, isArchived: boolean) {
    const label = await this.dependencies.setLabelArchived(
      labelId,
      userId,
      isArchived
    );
    if (!label) {
      throw new LabelNotFoundError();
    }
    return toLabelModel(label, label._count.taskLabels);
  }
}
