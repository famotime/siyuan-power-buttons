import { describe, expect, it } from "vitest";
import {
  BUILTIN_COMMANDS,
  PLUGIN_COMMANDS,
  formatExternalCommandActionId,
} from "@/core/commands";
import { createButtonItem } from "@/core/config/defaults";
import {
  applyActionTypeDefaults,
  applyIconTypeDefaults,
  ensureExperimentalClickSequenceConfig,
  ensureExperimentalShortcutConfig,
  ensureSelectedActionConfiguration,
  summarizeClickSequence,
} from "@/features/settings/action-config";
import type { SettingsExternalCommandProvider } from "@/features/settings/types";

describe("settings action config helpers", () => {
  it("creates an empty experimental shortcut config without forcing a fallback shortcut", () => {
    const item = createButtonItem({
      actionType: "experimental-shortcut",
      actionId: "",
      experimentalShortcut: undefined,
    });

    const shortcut = ensureExperimentalShortcutConfig(item);

    expect(shortcut).toEqual({
      shortcut: "",
      sendEscapeBefore: false,
      dispatchTarget: "auto",
      allowDirectWindowDispatch: false,
    });
    expect(item.actionId).toBe("");
  });

  it("rebuilds a missing click sequence from the current action id", () => {
    const item = createButtonItem({
      actionType: "experimental-click-sequence",
      actionId: "barSettings",
      experimentalClickSequence: {
        steps: [],
        stopOnFailure: false,
      },
    });
    item.experimentalClickSequence!.steps = [];

    const sequence = ensureExperimentalClickSequenceConfig(item);

    expect(sequence).toEqual({
      steps: [
        {
          selector: "barSettings",
          timeoutMs: 5000,
          retryCount: 2,
          retryDelayMs: 300,
          delayAfterMs: 200,
        },
      ],
      stopOnFailure: false,
    });
    expect(summarizeClickSequence(sequence)).toBe("barSettings");
  });

  it("hydrates the selected item based on its action type", () => {
    const shortcutItem = createButtonItem({
      actionType: "experimental-shortcut",
      actionId: "",
      experimentalShortcut: undefined,
    });
    const clickSequenceItem = createButtonItem({
      actionType: "experimental-click-sequence",
      actionId: "",
      experimentalClickSequence: undefined,
    });

    ensureSelectedActionConfiguration(shortcutItem);
    ensureSelectedActionConfiguration(clickSequenceItem);

    expect(shortcutItem.experimentalShortcut?.shortcut).toBe("");
    expect(clickSequenceItem.experimentalClickSequence?.steps[0]?.selector).toBe("text:设置");
  });

  it("applies action type defaults from the available command catalogs", () => {
    const builtinItem = createButtonItem({
      actionType: "builtin-global-command",
      actionId: "",
    });
    const pluginItem = createButtonItem({
      actionType: "plugin-command",
      actionId: "",
    });
    const shortcutItem = createButtonItem({
      actionType: "experimental-shortcut",
      actionId: "",
      experimentalShortcut: undefined,
    });

    applyActionTypeDefaults(builtinItem, BUILTIN_COMMANDS, PLUGIN_COMMANDS);
    applyActionTypeDefaults(pluginItem, BUILTIN_COMMANDS, PLUGIN_COMMANDS);
    applyActionTypeDefaults(shortcutItem, BUILTIN_COMMANDS, PLUGIN_COMMANDS);

    expect(builtinItem.actionId).toBe(BUILTIN_COMMANDS[0].id);
    expect(pluginItem.actionId).toBe("siyuan-power-buttons:open-settings");
    expect(shortcutItem.actionId).toBe("");
    expect(shortcutItem.experimentalShortcut?.shortcut).toBe("");
  });

  it("applies plugin command defaults from the first discovered provider command", () => {
    const externalItem = createButtonItem({
      actionType: "plugin-command",
      actionId: "",
    });
    const externalProviders: SettingsExternalCommandProvider[] = [
      {
        providerId: "siyuan-doc-assist",
        providerName: "文档助手 / Doc Assist",
        commands: [
          {
            id: "insert-doc-summary",
            title: "插入文档摘要",
          },
        ],
      },
    ];

    applyActionTypeDefaults(externalItem, BUILTIN_COMMANDS, [], externalProviders);

    expect(externalItem.actionId).toBe(
      formatExternalCommandActionId("siyuan-doc-assist", "insert-doc-summary"),
    );
  });

  it("applies icon defaults for each icon type", () => {
    const builtinItem = createButtonItem({
      iconType: "builtin",
      iconValue: "",
    });
    const emojiItem = createButtonItem({
      iconType: "emoji",
      iconValue: "",
    });
    const svgItem = createButtonItem({
      iconType: "svg",
      iconValue: "",
    });

    applyIconTypeDefaults(builtinItem);
    applyIconTypeDefaults(emojiItem);
    applyIconTypeDefaults(svgItem);

    expect(builtinItem.iconValue).toBe("iconInfo");
    expect(emojiItem.iconValue).toBe("⚡");
    expect(svgItem.iconValue).toContain("<svg");
  });
});
