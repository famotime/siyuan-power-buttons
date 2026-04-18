import type { Plugin } from "siyuan";
import { SETTINGS_UI_STORAGE_NAME } from "@/shared/constants";

export interface SettingsUiState {
  lastSelectedButtonId: string;
}

function sanitizeSettingsUiState(input: unknown): SettingsUiState {
  const candidate = input as { lastSelectedButtonId?: unknown } | null | undefined;
  return {
    lastSelectedButtonId: typeof candidate?.lastSelectedButtonId === "string"
      ? candidate.lastSelectedButtonId
      : "",
  };
}

export class SettingsUiStateStore {
  private state: SettingsUiState = {
    lastSelectedButtonId: "",
  };

  constructor(private readonly plugin: Plugin) {}

  async load(): Promise<SettingsUiState> {
    const stored = await this.plugin.loadData(SETTINGS_UI_STORAGE_NAME);
    this.state = sanitizeSettingsUiState(stored);
    return this.snapshot();
  }

  snapshot(): SettingsUiState {
    return {
      ...this.state,
    };
  }

  async setLastSelectedButtonId(lastSelectedButtonId: string): Promise<void> {
    this.state = {
      lastSelectedButtonId,
    };
    await this.plugin.saveData(SETTINGS_UI_STORAGE_NAME, this.state);
  }
}
