import type { Plugin } from "siyuan";
import { createDefaultConfig } from "@/core/config/defaults";
import { sanitizeConfig } from "@/core/config/sanitize";
import { CONFIG_STORAGE_NAME } from "@/shared/constants";
import { cloneConfig } from "@/shared/utils";
import type { PowerButtonsConfig } from "@/shared/types";

type Listener = (config: PowerButtonsConfig) => void;

export class ConfigStore {
  private config = createDefaultConfig();
  private listeners = new Set<Listener>();

  constructor(private readonly plugin: Plugin) {}

  async load(): Promise<PowerButtonsConfig> {
    const stored = await this.plugin.loadData(CONFIG_STORAGE_NAME);
    this.config = sanitizeConfig(stored);
    return this.snapshot();
  }

  getConfig(): PowerButtonsConfig {
    return this.config;
  }

  snapshot(): PowerButtonsConfig {
    return cloneConfig(this.config);
  }

  async replace(nextConfig: PowerButtonsConfig): Promise<PowerButtonsConfig> {
    this.config = sanitizeConfig(nextConfig);
    await this.persist();
    this.notify();
    return this.snapshot();
  }

  async reset(): Promise<PowerButtonsConfig> {
    this.config = createDefaultConfig();
    await this.persist();
    this.notify();
    return this.snapshot();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async persist(): Promise<void> {
    await this.plugin.saveData(CONFIG_STORAGE_NAME, this.config);
  }

  private notify(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
