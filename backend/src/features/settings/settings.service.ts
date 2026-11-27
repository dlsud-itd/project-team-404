import type {
  UserSettingsRecord,
  UserSettings,
} from './models/user-settings.model';
import { toUserSettingsModel } from './models/user-settings.model';
import type { UpdateSettingsInput } from './types';

export type SettingsDependencies = {
  getOrCreateSettings(userId: string): Promise<UserSettingsRecord>;
  updateSettings(
    userId: string,
    input: UpdateSettingsInput
  ): Promise<UserSettingsRecord>;
  /** Looks up one of the user's own projects; used to check a new default project. */
  findOwnedProject?(
    projectId: number,
    userId: string
  ): Promise<{ isArchived: boolean } | null>;
};

/** The chosen default project isn't one of the user's active projects. */
export class DefaultProjectNotFoundError extends Error {
  constructor() {
    super('Default project not found');
    this.name = 'DefaultProjectNotFoundError';
  }
}

export class SettingsService {
  constructor(private readonly dependencies: SettingsDependencies) {}

  async get(userId: string): Promise<UserSettings> {
    return toUserSettingsModel(
      await this.dependencies.getOrCreateSettings(userId)
    );
  }

  async update(
    userId: string,
    input: UpdateSettingsInput
  ): Promise<UserSettings> {
    if (
      typeof input.defaultProjectId === 'number' &&
      this.dependencies.findOwnedProject
    ) {
      const project = await this.dependencies.findOwnedProject(
        input.defaultProjectId,
        userId
      );
      if (!project || project.isArchived) {
        throw new DefaultProjectNotFoundError();
      }
    }
    return toUserSettingsModel(
      await this.dependencies.updateSettings(userId, input)
    );
  }
}
