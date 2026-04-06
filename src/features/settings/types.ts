import type {
  BuiltinCommandDefinition,
  PluginCommandDefinition,
  PowerButtonsConfig,
  PreviewButtonItem,
} from "@/shared/types";

export interface SettingsAppProps {
  initialConfig: PowerButtonsConfig;
  builtinCommands: BuiltinCommandDefinition[];
  pluginCommands: PluginCommandDefinition[];
  onChange: (config: PowerButtonsConfig) => void | Promise<void>;
  onNotify: (message: string, type?: "info" | "error") => void;
  onReadCurrentLayout?: () => PreviewButtonItem[] | Promise<PreviewButtonItem[]>;
}
