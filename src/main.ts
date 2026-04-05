import { createApp } from "vue";
import App from "@/App.vue";
import "@/index.scss";
import type {
  BuiltinCommandDefinition,
  PluginCommandDefinition,
  PreviewButtonItem,
  PowerButtonsConfig,
} from "@/shared/types";

export interface SettingsAppProps {
  initialConfig: PowerButtonsConfig;
  builtinCommands: BuiltinCommandDefinition[];
  pluginCommands: PluginCommandDefinition[];
  onChange: (config: PowerButtonsConfig) => void | Promise<void>;
  onNotify: (message: string, type?: "info" | "error") => void;
  onReadCurrentLayout?: () => PreviewButtonItem[] | Promise<PreviewButtonItem[]>;
}

export function mountSettingsApp(target: HTMLElement, props: SettingsAppProps): () => void {
  const app = createApp(App, props as unknown as Record<string, unknown>);
  app.mount(target);
  return () => {
    app.unmount();
  };
}
