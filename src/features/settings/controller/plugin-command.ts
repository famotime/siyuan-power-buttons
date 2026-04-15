import { parseExternalCommandActionId } from '@/core/commands';
import { INTERNAL_PLUGIN_PROVIDER_ID, INTERNAL_PLUGIN_PROVIDER_NAME } from '@/shared/constants';
import type { PluginCommandDefinition, PowerButtonItem } from '@/shared/types';
import type {
  SettingsExternalCommandProvider,
  SettingsPluginCommandProvider,
} from '@/features/settings/types';

export function buildPluginCommandProviders(
  pluginCommands: PluginCommandDefinition[],
  externalCommandProviders: SettingsExternalCommandProvider[],
): SettingsPluginCommandProvider[] {
  const providers: SettingsPluginCommandProvider[] = [];

  if (pluginCommands.length > 0) {
    providers.push({
      providerId: INTERNAL_PLUGIN_PROVIDER_ID,
      providerName: INTERNAL_PLUGIN_PROVIDER_NAME,
      commands: pluginCommands.map(command => ({
        id: command.id,
        title: command.title,
        description: command.description,
      })),
      internal: true,
    });
  }

  providers.push(...externalCommandProviders);
  return providers;
}

export function findSelectedPluginProvider(
  item: PowerButtonItem | undefined,
  pluginCommandProviders: SettingsPluginCommandProvider[],
): SettingsPluginCommandProvider | null {
  if (!item || item.actionType !== 'plugin-command') {
    return null;
  }

  const parsed = parseExternalCommandActionId(item.actionId);
  if (!parsed) {
    return null;
  }

  return pluginCommandProviders.find(provider => provider.providerId === parsed.providerId) || null;
}

export function findSelectedPluginCommand(
  item: PowerButtonItem | undefined,
  provider: SettingsPluginCommandProvider | null,
): SettingsPluginCommandProvider['commands'][number] | null {
  if (!item || item.actionType !== 'plugin-command') {
    return null;
  }

  const parsed = parseExternalCommandActionId(item.actionId);
  if (!parsed) {
    return null;
  }

  return provider?.commands.find(command => command.id === parsed.commandId) || null;
}

export function hasValidPluginCommandSelection(
  actionId: string,
  pluginCommandProviders: SettingsPluginCommandProvider[],
): boolean {
  const parsed = parseExternalCommandActionId(actionId);
  if (!parsed) {
    return false;
  }

  return pluginCommandProviders.some(provider =>
    provider.providerId === parsed.providerId
    && (parsed.commandId === '__unset__' || provider.commands.some(command => command.id === parsed.commandId)),
  );
}
