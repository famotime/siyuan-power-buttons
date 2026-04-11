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

type ExternalCommandInvokeErrorCode =
  | "command-not-found"
  | "provider-unavailable"
  | "context-unavailable"
  | "not-supported"
  | "execution-failed";

export type ExternalCommandInvokeResult =
  | {
      ok: true;
      message?: string;
      alreadyNotified?: boolean;
    }
  | {
      ok: false;
      message?: string;
      alreadyNotified?: boolean;
      errorCode: ExternalCommandInvokeErrorCode;
    };

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
  if (providerId.trim() !== providerId || commandId.trim() !== commandId) {
    throw new Error("External command action id parts must not include padding whitespace.");
  }
  if (!providerId || !commandId) {
    throw new Error("External command action id parts must be non-empty.");
  }
  if (providerId === "__external__" && commandId === "__unset__") {
    throw new Error("External command action id cannot use the reserved placeholder.");
  }
  if (providerId.includes(":") || commandId.includes(":")) {
    throw new Error("External command action id parts must not include colons.");
  }
  return `${providerId}:${commandId}`;
}

export function parseExternalCommandActionId(
  actionId: string,
): { providerId: string; commandId: string } | null {
  const trimmed = actionId.trim();
  if (!trimmed || trimmed !== actionId) {
    return null;
  }
  if (trimmed === "__external__:__unset__") {
    return null;
  }
  const separator = trimmed.indexOf(":");
  if (separator <= 0 || separator === trimmed.length - 1 || separator !== trimmed.lastIndexOf(":")) {
    return null;
  }
  const providerId = trimmed.slice(0, separator);
  const commandId = trimmed.slice(separator + 1);
  if (!providerId || !commandId) {
    return null;
  }
  if (providerId.trim() !== providerId || commandId.trim() !== commandId) {
    return null;
  }
  if (providerId.includes(":") || commandId.includes(":")) {
    return null;
  }
  return {
    providerId,
    commandId,
  };
}

export function isExternalCommandActionId(actionId: string): boolean {
  return parseExternalCommandActionId(actionId) !== null;
}
