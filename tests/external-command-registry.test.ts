import { describe, expect, it } from "vitest";
import type { ExternalCommandProvider } from "@/core/commands/external-command-types";
import { ExternalCommandRegistry } from "@/core/commands/external-command-registry";

describe("ExternalCommandRegistry", () => {
  it("discovers valid providers and ignores invalid ones", async () => {
    const mockProvider: ExternalCommandProvider = {
      protocol: "power-buttons-command-provider",
      protocolVersion: 1,
      providerId: "siyuan-doc-assist",
      providerName: "文档助手 / Doc Assist",
      providerVersion: "1.2",
      listCommands: () => [
        {
          id: "insert-doc-summary",
          title: "插入文档摘要",
        },
      ],
      invokeCommand: () =>
        Promise.resolve({
          ok: true,
        }),
    };

    const registry = new ExternalCommandRegistry({
      getPlugins: () => [
        {
          name: "missing-integration",
        },
        {
          name: "invalid-protocol",
          getPowerButtonsIntegration: () => ({
            ...mockProvider,
            providerId: "should-be-ignored",
            protocolVersion: 2,
          }),
        },
        {
          name: "doc-assist",
          getPowerButtonsIntegration: () => mockProvider,
        },
      ],
    });

    await registry.refresh();

    expect(registry.listProviders()).toEqual([
      expect.objectContaining({
        providerId: "siyuan-doc-assist",
        providerName: "文档助手 / Doc Assist",
      }),
    ]);

    expect(await registry.listCommands("siyuan-doc-assist")).toEqual([
      expect.objectContaining({
        id: "insert-doc-summary",
      }),
    ]);

    expect(registry.getProvider("siyuan-doc-assist")).toBe(mockProvider);
    expect(registry.getProvider("should-be-ignored")).toBeNull();
  });
});
