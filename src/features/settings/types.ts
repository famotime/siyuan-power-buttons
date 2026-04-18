import type {
  ExternalCommandProviderSummary,
  ExternalPluginCommandDefinition,
} from "@/core/commands";
import type {
  BuiltinCommandDefinition,
  PluginCommandDefinition,
  PowerButtonsConfig,
  PreviewButtonItem,
} from "@/shared/types";

export interface SettingsExternalCommandProvider extends ExternalCommandProviderSummary {
  commands: ExternalPluginCommandDefinition[];
}

export interface SettingsPluginCommandProvider extends SettingsExternalCommandProvider {
  internal?: boolean;
}

export interface SettingsAppProps {
  initialConfig: PowerButtonsConfig;
  initialSelectedButtonId?: string;
  builtinCommands: BuiltinCommandDefinition[];
  pluginCommands: PluginCommandDefinition[];
  externalCommandProviders: SettingsExternalCommandProvider[];
  onChange: (config: PowerButtonsConfig) => void | Promise<void>;
  onNotify: (message: string, type?: "info" | "error") => void;
  onSelectedIdChange?: (itemId: string) => void | Promise<void>;
  onRefreshExternalCommands?: () => SettingsExternalCommandProvider[] | Promise<SettingsExternalCommandProvider[]>;
  onReadCurrentLayout?: () => PreviewButtonItem[] | Promise<PreviewButtonItem[]>;
}
