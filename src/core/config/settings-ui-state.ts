import type { Plugin } from "siyuan"
import { SETTINGS_UI_STORAGE_NAME } from "@/shared/constants"

export interface SettingsUiState {
  lastSelectedButtonId: string
  isPluginListCollapsed?: boolean
  expandedPluginGroups?: string[]
}

function sanitizeSettingsUiState(input: unknown): SettingsUiState {
  const candidate = input as {
    lastSelectedButtonId?: unknown
    isPluginListCollapsed?: unknown
    expandedPluginGroups?: unknown
  } | null | undefined
  return {
    lastSelectedButtonId: typeof candidate?.lastSelectedButtonId === "string"
      ? candidate.lastSelectedButtonId
      : "",
    isPluginListCollapsed: typeof candidate?.isPluginListCollapsed === "boolean"
      ? candidate.isPluginListCollapsed
      : false,
    expandedPluginGroups: Array.isArray(candidate?.expandedPluginGroups)
      ? candidate.expandedPluginGroups.filter((item): item is string => typeof item === "string")
      : [],
  }
}

export class SettingsUiStateStore {
  private state: SettingsUiState = {
    lastSelectedButtonId: "",
    isPluginListCollapsed: false,
    expandedPluginGroups: [],
  }

  constructor(private readonly plugin: Plugin) {}

  async load(): Promise<SettingsUiState> {
    const stored = await this.plugin.loadData(SETTINGS_UI_STORAGE_NAME)
    this.state = sanitizeSettingsUiState(stored)
    return this.snapshot()
  }

  snapshot(): SettingsUiState {
    return {
      ...this.state,
    }
  }

  async setLastSelectedButtonId(lastSelectedButtonId: string): Promise<void> {
    this.state = {
      ...this.state,
      lastSelectedButtonId,
    }
    await this.plugin.saveData(SETTINGS_UI_STORAGE_NAME, this.state)
  }

  async setPluginListCollapsed(isPluginListCollapsed: boolean): Promise<void> {
    this.state = {
      ...this.state,
      isPluginListCollapsed,
    }
    await this.plugin.saveData(SETTINGS_UI_STORAGE_NAME, this.state)
  }

  async setExpandedPluginGroups(expandedPluginGroups: string[]): Promise<void> {
    this.state = {
      ...this.state,
      expandedPluginGroups,
    }
    await this.plugin.saveData(SETTINGS_UI_STORAGE_NAME, this.state)
  }
}
