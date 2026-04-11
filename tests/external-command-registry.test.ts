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

  it("skips malformed, throwing, and duplicate providers during refresh", async () => {
    const primaryProvider: ExternalCommandProvider = {
      protocol: "power-buttons-command-provider",
      protocolVersion: 1,
      providerId: "siyuan-doc-assist",
      providerName: "文档助手 / Doc Assist",
      listCommands: () => [{ id: "insert-doc-summary", title: "插入文档摘要" }],
      invokeCommand: () => Promise.resolve({ ok: true }),
    };
    const shadowProvider: ExternalCommandProvider = {
      ...primaryProvider,
      providerName: "Shadow Provider",
      listCommands: () => [{ id: "shadow-command", title: "Shadow" }],
    };

    const registry = new ExternalCommandRegistry({
      getPlugins: () => [
        {
          name: "throws-integration",
          getPowerButtonsIntegration: () => {
            throw new Error("broken integration");
          },
        },
        {
          name: "malformed-provider",
          getPowerButtonsIntegration: () => ({
            protocol: "power-buttons-command-provider",
            protocolVersion: 1,
            providerId: "",
            providerName: "Broken",
            listCommands: "nope",
            invokeCommand: () => Promise.resolve({ ok: true }),
          }),
        },
        {
          name: "provider-with-invalid-id",
          getPowerButtonsIntegration: () => ({
            ...primaryProvider,
            providerId: "bad:id",
            providerName: "Bad Provider Id",
          }),
        },
        {
          name: "throws-list-commands",
          getPowerButtonsIntegration: () => ({
            ...primaryProvider,
            providerId: "throws-list",
            listCommands: () => {
              throw new Error("commands unavailable");
            },
          }),
        },
        {
          name: "doc-assist-primary",
          getPowerButtonsIntegration: () => ({
            ...primaryProvider,
            listCommands: () => [
              { id: "insert-doc-summary", title: "插入文档摘要" },
              { id: "bad:command", title: "Bad Command Id" },
              { id: "trimmed-command", title: "  " },
            ],
          }),
        },
        {
          name: "doc-assist-shadow",
          getPowerButtonsIntegration: () => shadowProvider,
        },
      ],
    });

    await registry.refresh();

    expect(registry.listProviders()).toEqual([
      {
        providerId: "siyuan-doc-assist",
        providerName: "文档助手 / Doc Assist",
        providerVersion: undefined,
      },
    ]);
    expect(await registry.listCommands("siyuan-doc-assist")).toEqual([
      { id: "insert-doc-summary", title: "插入文档摘要" },
    ]);
    expect(registry.getProvider("bad:id")).toBeNull();
  });

  it("preserves the previous snapshot when refresh fails before a new snapshot is ready", async () => {
    const mockProvider: ExternalCommandProvider = {
      protocol: "power-buttons-command-provider",
      protocolVersion: 1,
      providerId: "siyuan-doc-assist",
      providerName: "文档助手 / Doc Assist",
      listCommands: () => [{ id: "insert-doc-summary", title: "插入文档摘要" }],
      invokeCommand: () => Promise.resolve({ ok: true }),
    };

    let shouldThrow = false;
    const registry = new ExternalCommandRegistry({
      getPlugins: () => {
        if (shouldThrow) {
          throw new Error("plugin enumeration failed");
        }
        return [
          {
            name: "doc-assist",
            getPowerButtonsIntegration: () => mockProvider,
          },
        ];
      },
    });

    await registry.refresh();
    shouldThrow = true;

    await expect(registry.refresh()).rejects.toThrow("plugin enumeration failed");
    expect(registry.listProviders()).toEqual([
      {
        providerId: "siyuan-doc-assist",
        providerName: "文档助手 / Doc Assist",
        providerVersion: undefined,
      },
    ]);
    expect(await registry.listCommands("siyuan-doc-assist")).toEqual([
      { id: "insert-doc-summary", title: "插入文档摘要" },
    ]);
  });
});
