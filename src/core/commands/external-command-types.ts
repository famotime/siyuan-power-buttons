export interface ExternalCommandProviderSummary {
  providerId: string;
  providerName: string;
  providerVersion?: string;
}

export interface ExternalPluginCommandDefinition {
  id: string;
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  keywords?: string[];
  desktopOnly?: boolean;
  supportsMobile?: boolean;
}

export interface ExternalCommandInvokeContext {
  trigger: "button-click";
  sourcePlugin: "siyuan-power-buttons";
  sourcePluginVersion?: string;
  surface?: string;
  buttonId?: string;
}

export interface ExternalCommandInvokeResult {
  ok: boolean;
  message?: string;
  alreadyNotified?: boolean;
  errorCode?:
    | "command-not-found"
    | "provider-unavailable"
    | "context-unavailable"
    | "not-supported"
    | "execution-failed";
}

export interface ExternalCommandProvider extends ExternalCommandProviderSummary {
  protocol: "power-buttons-command-provider";
  protocolVersion: 1;
  listCommands: () => Promise<ExternalPluginCommandDefinition[]> | ExternalPluginCommandDefinition[];
  invokeCommand: (
    commandId: string,
    context: ExternalCommandInvokeContext,
  ) => Promise<ExternalCommandInvokeResult> | ExternalCommandInvokeResult;
}

export function formatExternalCommandActionId(providerId: string, commandId: string): string {
  return `${providerId.trim()}:${commandId.trim()}`;
}

export function parseExternalCommandActionId(
  actionId: string,
): { providerId: string; commandId: string } | null {
  const trimmed = actionId.trim();
  const separator = trimmed.indexOf(":");
  if (separator <= 0 || separator === trimmed.length - 1) {
    return null;
  }
  return {
    providerId: trimmed.slice(0, separator),
    commandId: trimmed.slice(separator + 1),
  };
}

export function isExternalCommandActionId(actionId: string): boolean {
  return parseExternalCommandActionId(actionId) !== null;
}
