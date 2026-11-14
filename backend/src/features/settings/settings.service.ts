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
};

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
    return toUserSettingsModel(
      await this.dependencies.updateSettings(userId, input)
    );
  }
}
