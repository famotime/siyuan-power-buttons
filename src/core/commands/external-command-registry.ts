import type {
  ExternalCommandProvider,
  ExternalCommandProviderSummary,
  ExternalPluginCommandDefinition,
} from "@/core/commands/external-command-types";

type IntegratablePlugin = {
  name?: string;
  getPowerButtonsIntegration?: () => ExternalCommandProvider | null;
};

interface ExternalCommandRegistryOptions {
  getPlugins: () => IntegratablePlugin[] | undefined;
}

export class ExternalCommandRegistry {
  private readonly providers = new Map<string, ExternalCommandProvider>();
  private readonly commandCache = new Map<string, ExternalPluginCommandDefinition[]>();

  constructor(private readonly options: ExternalCommandRegistryOptions) {}

  async refresh(): Promise<void> {
    this.providers.clear();
    this.commandCache.clear();

    const plugins = this.options.getPlugins() ?? [];

    for (const plugin of plugins) {
      const provider = plugin.getPowerButtonsIntegration?.();
      if (
        !provider ||
        provider.protocol !== "power-buttons-command-provider" ||
        provider.protocolVersion !== 1
      ) {
        continue;
      }

      this.providers.set(provider.providerId, provider);
      const commands = await provider.listCommands();
      this.commandCache.set(provider.providerId, commands ?? []);
    }
  }

  listProviders(): ExternalCommandProviderSummary[] {
    return Array.from(this.providers.values()).map(
      ({ providerId, providerName, providerVersion }) => ({
        providerId,
        providerName,
        providerVersion,
      }),
    );
  }

  async listCommands(providerId: string): Promise<ExternalPluginCommandDefinition[]> {
    return this.commandCache.get(providerId) || [];
  }

  getProvider(providerId: string): ExternalCommandProvider | null {
    return this.providers.get(providerId) || null;
  }
}
