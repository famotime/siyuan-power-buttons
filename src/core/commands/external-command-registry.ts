import type {
  ExternalCommandProvider,
  ExternalCommandProviderSummary,
  ExternalPluginCommandDefinition,
} from "@/core/commands/external-command-types";

type IntegratablePlugin = {
  name?: string;
  getPowerButtonsIntegration?: () => unknown;
};

interface ExternalCommandRegistryOptions {
  getPlugins: () => IntegratablePlugin[] | undefined;
}

function isValidProvider(provider: unknown): provider is ExternalCommandProvider {
  if (!provider || typeof provider !== "object") {
    return false;
  }

  const candidate = provider as Partial<ExternalCommandProvider>;
  if (candidate.protocol !== "power-buttons-command-provider" || candidate.protocolVersion !== 1) {
    return false;
  }

  if (typeof candidate.providerId !== "string" || !candidate.providerId.trim()) {
    return false;
  }

  if (candidate.providerId.trim() !== candidate.providerId) {
    return false;
  }

  if (typeof candidate.providerName !== "string" || !candidate.providerName.trim()) {
    return false;
  }

  return typeof candidate.listCommands === "function" && typeof candidate.invokeCommand === "function";
}

export class ExternalCommandRegistry {
  private readonly providers = new Map<string, ExternalCommandProvider>();
  private readonly commandCache = new Map<string, ExternalPluginCommandDefinition[]>();

  constructor(private readonly options: ExternalCommandRegistryOptions) {}

  async refresh(): Promise<void> {
    const plugins = this.options.getPlugins() ?? [];
    const nextProviders = new Map<string, ExternalCommandProvider>();
    const nextCommandCache = new Map<string, ExternalPluginCommandDefinition[]>();

    for (const plugin of plugins) {
      let provider: unknown;

      try {
        provider = plugin.getPowerButtonsIntegration?.();
      } catch {
        continue;
      }

      if (!isValidProvider(provider)) {
        continue;
      }

      if (nextProviders.has(provider.providerId)) {
        continue;
      }

      let commands: ExternalPluginCommandDefinition[];
      try {
        const result = await provider.listCommands();
        if (!Array.isArray(result)) {
          continue;
        }
        commands = result;
      } catch {
        continue;
      }

      nextProviders.set(provider.providerId, provider);
      nextCommandCache.set(provider.providerId, commands);
    }

    this.providers.clear();
    this.commandCache.clear();
    nextProviders.forEach((provider, providerId) => {
      this.providers.set(providerId, provider);
    });
    nextCommandCache.forEach((commands, providerId) => {
      this.commandCache.set(providerId, commands);
    });
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
