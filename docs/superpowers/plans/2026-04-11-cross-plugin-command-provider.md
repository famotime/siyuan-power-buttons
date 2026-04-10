# Cross-Plugin Command Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `siyuan-power-buttons` discover and bind explicitly exposed commands from other installed plugins, starting with `siyuan-doc-assist`.

**Architecture:** Add a versioned external command provider protocol and discovery registry to `power-buttons`, then expose a provider whitelist from `doc-assist` through its plugin lifecycle instance. Keep provider-owned context resolution inside the provider plugin; `power-buttons` only stores bindings, renders selector UI, and forwards execution requests.

**Tech Stack:** TypeScript, Vue 3, Vitest, jsdom, SiYuan plugin runtime APIs

---

### Task 1: Add provider protocol types and external action-id helpers in `power-buttons`

**Files:**
- Create: `src/core/commands/external-command-types.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/constants.ts`
- Modify: `src/core/config/item-defaults.ts`
- Test: `tests/config-item-defaults.test.ts`
- Test: `tests/external-command-types.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/config-item-defaults.test.ts
it("returns a stable default for external plugin commands", () => {
  expect(getDefaultActionId("external-plugin-command" as any)).toBe("__external__:__unset__");
});

// tests/external-command-types.test.ts
import {
  formatExternalCommandActionId,
  isExternalCommandActionId,
  parseExternalCommandActionId,
} from "@/core/commands/external-command-types";

describe("external command action ids", () => {
  it("formats and parses provider command ids", () => {
    const actionId = formatExternalCommandActionId("siyuan-doc-assist", "insert-doc-summary");

    expect(actionId).toBe("siyuan-doc-assist:insert-doc-summary");
    expect(parseExternalCommandActionId(actionId)).toEqual({
      providerId: "siyuan-doc-assist",
      commandId: "insert-doc-summary",
    });
    expect(isExternalCommandActionId(actionId)).toBe(true);
  });

  it("rejects malformed external command ids", () => {
    expect(parseExternalCommandActionId("missing-separator")).toBeNull();
    expect(parseExternalCommandActionId(":insert-doc-summary")).toBeNull();
    expect(isExternalCommandActionId("")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/config-item-defaults.test.ts tests/external-command-types.test.ts`
Expected: FAIL because `external-plugin-command` and the helper module do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/types.ts
export const ACTION_TYPES = [
  "builtin-global-command",
  "plugin-command",
  "external-plugin-command",
  "open-url",
  "experimental-shortcut",
  "experimental-click-sequence",
] as const;

// src/shared/constants.ts
export const ACTION_TYPE_LABELS: Record<string, string> = {
  "builtin-global-command": "内置命令",
  "plugin-command": "插件命令",
  "external-plugin-command": "外部插件命令",
  "open-url": "打开链接",
  "experimental-shortcut": "实验：快捷键适配",
  "experimental-click-sequence": "实验：点击序列",
};

// src/core/config/item-defaults.ts
export const DEFAULT_EXTERNAL_PLUGIN_COMMAND = "__external__:__unset__";

export function getDefaultActionId(actionType: ActionType): string {
  if (actionType === "experimental-shortcut") return "";
  if (actionType === "plugin-command") return DEFAULT_PLUGIN_COMMAND;
  if (actionType === "external-plugin-command") return DEFAULT_EXTERNAL_PLUGIN_COMMAND;
  if (actionType === "experimental-click-sequence") return DEFAULT_CLICK_SEQUENCE_SELECTOR;
  return "globalSearch";
}

// src/core/commands/external-command-types.ts
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

export function parseExternalCommandActionId(actionId: string): { providerId: string; commandId: string } | null {
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/config-item-defaults.test.ts tests/external-command-types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/commands/external-command-types.ts src/shared/types.ts src/shared/constants.ts src/core/config/item-defaults.ts tests/config-item-defaults.test.ts tests/external-command-types.test.ts
git commit -m "feat: add external command protocol types"
```

### Task 2: Build the external provider discovery registry in `power-buttons`

**Files:**
- Create: `src/core/commands/external-command-registry.ts`
- Modify: `src/core/commands/index.ts`
- Test: `tests/external-command-registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { ExternalCommandRegistry } from "@/core/commands/external-command-registry";

describe("external command registry", () => {
  it("discovers valid providers and ignores invalid plugins", async () => {
    const provider = {
      protocol: "power-buttons-command-provider",
      protocolVersion: 1 as const,
      providerId: "siyuan-doc-assist",
      providerName: "文档助手 / Doc Assist",
      listCommands: vi.fn().mockResolvedValue([
        { id: "insert-doc-summary", title: "插入文档摘要" },
      ]),
      invokeCommand: vi.fn(),
    };

    const registry = new ExternalCommandRegistry({
      getPlugins: () => [
        { name: "broken-plugin" },
        { name: "siyuan-doc-assist", getPowerButtonsIntegration: () => provider },
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
      expect.objectContaining({ id: "insert-doc-summary" }),
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/external-command-registry.test.ts`
Expected: FAIL because `ExternalCommandRegistry` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/commands/external-command-registry.ts
import type {
  ExternalCommandProvider,
  ExternalCommandProviderSummary,
  ExternalPluginCommandDefinition,
} from "@/core/commands/external-command-types";

type IntegratablePlugin = {
  name?: string;
  getPowerButtonsIntegration?: () => ExternalCommandProvider | null;
};

export class ExternalCommandRegistry {
  private providers = new Map<string, ExternalCommandProvider>();
  private commands = new Map<string, ExternalPluginCommandDefinition[]>();

  constructor(private readonly options: {
    getPlugins: () => IntegratablePlugin[] | undefined;
  }) {}

  async refresh(): Promise<void> {
    this.providers.clear();
    this.commands.clear();

    for (const plugin of this.options.getPlugins() || []) {
      const provider = plugin.getPowerButtonsIntegration?.();
      if (!provider || provider.protocol !== "power-buttons-command-provider" || provider.protocolVersion !== 1) {
        continue;
      }

      this.providers.set(provider.providerId, provider);
      this.commands.set(provider.providerId, await provider.listCommands());
    }
  }

  listProviders(): ExternalCommandProviderSummary[] {
    return Array.from(this.providers.values()).map(provider => ({
      providerId: provider.providerId,
      providerName: provider.providerName,
      providerVersion: provider.providerVersion,
    }));
  }

  async listCommands(providerId: string): Promise<ExternalPluginCommandDefinition[]> {
    return this.commands.get(providerId) || [];
  }

  getProvider(providerId: string): ExternalCommandProvider | null {
    return this.providers.get(providerId) || null;
  }
}

// src/core/commands/index.ts
export * from "@/core/commands/external-command-registry";
export * from "@/core/commands/external-command-types";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/external-command-registry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/commands/external-command-registry.ts src/core/commands/index.ts tests/external-command-registry.test.ts
git commit -m "feat: add external command registry"
```

### Task 3: Wire external commands into config sanitization and action defaults

**Files:**
- Modify: `src/features/settings/action-config.ts`
- Modify: `src/features/settings/types.ts`
- Modify: `src/core/config/defaults.ts`
- Modify: `src/core/config/sanitize.ts`
- Test: `tests/settings-action-config.test.ts`
- Test: `tests/config-store.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/settings-action-config.test.ts
it("applies defaults from discovered external providers", () => {
  const item = createButtonItem({
    actionType: "external-plugin-command" as never,
    actionId: "",
  });

  applyActionTypeDefaults(
    item,
    BUILTIN_COMMANDS,
    PLUGIN_COMMANDS,
    [
      {
        providerId: "siyuan-doc-assist",
        providerName: "文档助手 / Doc Assist",
        commands: [{ id: "insert-doc-summary", title: "插入文档摘要" }],
      },
    ],
  );

  expect(item.actionId).toBe("siyuan-doc-assist:insert-doc-summary");
});

// tests/config-store.test.ts
it("preserves external plugin command bindings during sanitize", () => {
  const config = sanitizeConfig({
    items: [{
      id: "item-1",
      title: "文档摘要",
      visible: true,
      iconType: "builtin",
      iconValue: "iconInfo",
      surface: "topbar",
      order: 0,
      actionType: "external-plugin-command",
      actionId: "siyuan-doc-assist:insert-doc-summary",
    }],
  });

  expect(config.items[0]?.actionType).toBe("external-plugin-command");
  expect(config.items[0]?.actionId).toBe("siyuan-doc-assist:insert-doc-summary");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/settings-action-config.test.ts tests/config-store.test.ts`
Expected: FAIL because the settings helper and sanitizer do not understand `external-plugin-command`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/settings/types.ts
import type { ExternalCommandProviderSummary, ExternalPluginCommandDefinition } from "@/core/commands";

export interface SettingsExternalCommandProvider extends ExternalCommandProviderSummary {
  commands: ExternalPluginCommandDefinition[];
}

export interface SettingsAppProps {
  initialConfig: PowerButtonsConfig;
  builtinCommands: BuiltinCommandDefinition[];
  pluginCommands: PluginCommandDefinition[];
  externalCommandProviders: SettingsExternalCommandProvider[];
  onChange: (config: PowerButtonsConfig) => void | Promise<void>;
  onNotify: (message: string, type?: "info" | "error") => void;
  onRefreshExternalCommands?: () => Promise<SettingsExternalCommandProvider[]>;
  onReadCurrentLayout?: () => PreviewButtonItem[] | Promise<PreviewButtonItem[]>;
}

// src/features/settings/action-config.ts
import { formatExternalCommandActionId } from "@/core/commands";
import type { SettingsExternalCommandProvider } from "@/features/settings/types";

export function applyActionTypeDefaults(
  item: PowerButtonItem,
  builtinCommands: BuiltinCommandDefinition[],
  pluginCommands: PluginCommandDefinition[],
  externalCommandProviders: SettingsExternalCommandProvider[] = [],
): void {
  if (item.actionType === "builtin-global-command") {
    item.actionId = builtinCommands[0]?.id || getDefaultActionId("builtin-global-command");
    return;
  }

  if (item.actionType === "plugin-command") {
    item.actionId = pluginCommands[0]?.id || getDefaultActionId("plugin-command");
    return;
  }

  if (item.actionType === "external-plugin-command") {
    const provider = externalCommandProviders[0];
    const command = provider?.commands[0];
    item.actionId = provider && command
      ? formatExternalCommandActionId(provider.providerId, command.id)
      : getDefaultActionId("external-plugin-command");
    return;
  }

  if (item.actionType === "experimental-shortcut") {
    item.actionId = ensureExperimentalShortcutConfig(item).shortcut.trim();
    return;
  }

  if (item.actionType === "experimental-click-sequence") {
    item.actionId = summarizeClickSequence(ensureExperimentalClickSequenceConfig(item));
  }
}

// src/core/config/sanitize.ts
import { isExternalCommandActionId } from "@/core/commands";

if (actionType === "external-plugin-command" && actionId && !isExternalCommandActionId(actionId)) {
  actionId = getDefaultActionId(actionType);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/settings-action-config.test.ts tests/config-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/action-config.ts src/features/settings/types.ts src/core/config/defaults.ts src/core/config/sanitize.ts tests/settings-action-config.test.ts tests/config-store.test.ts
git commit -m "feat: support external command bindings in config"
```

### Task 4: Execute external provider commands from `power-buttons`

**Files:**
- Modify: `src/core/commands/executor.ts`
- Modify: `src/index.ts`
- Modify: `src/core/runtime/plugin-runtime.ts`
- Test: `tests/command-executor.test.ts`
- Test: `tests/plugin-runtime.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/command-executor.test.ts
it("dispatches external plugin commands through the registry provider", async () => {
  const invokeCommand = vi.fn().mockResolvedValue({ ok: true, alreadyNotified: true });
  const externalCommands = {
    refresh: vi.fn(),
    getProvider: vi.fn(() => ({
      protocol: "power-buttons-command-provider",
      protocolVersion: 1,
      providerId: "siyuan-doc-assist",
      providerName: "文档助手 / Doc Assist",
      listCommands: vi.fn(),
      invokeCommand,
    })),
  };

  const executor = new CommandExecutor({
    plugin: {} as never,
    notify: vi.fn(),
    openUrl: vi.fn(),
    pluginCommands: new Map(),
    externalCommands,
  });

  await executor.execute(createItem({
    id: "doc-summary",
    surface: "topbar",
    actionType: "external-plugin-command" as never,
    actionId: "siyuan-doc-assist:insert-doc-summary",
  }));

  expect(invokeCommand).toHaveBeenCalledWith("insert-doc-summary", expect.objectContaining({
    trigger: "button-click",
    buttonId: "doc-summary",
    surface: "topbar",
  }));
});

// tests/plugin-runtime.test.ts
it("passes discovered external providers into the settings app props", async () => {
  const state = createRuntime({
    externalCommands: {
      listProviders: () => [{ providerId: "siyuan-doc-assist", providerName: "文档助手 / Doc Assist" }],
      listCommands: vi.fn().mockResolvedValue([{ id: "insert-doc-summary", title: "插入文档摘要" }]),
      refresh: vi.fn().mockResolvedValue(undefined),
      getProvider: vi.fn(),
    },
  });

  await state.runtime.onload();
  await state.runtime.openSetting();

  expect(state.settingsDialog.open).toHaveBeenCalledWith(expect.objectContaining({
    externalCommandProviders: [
      expect.objectContaining({
        providerId: "siyuan-doc-assist",
        commands: [{ id: "insert-doc-summary", title: "插入文档摘要" }],
      }),
    ],
  }));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/command-executor.test.ts tests/plugin-runtime.test.ts`
Expected: FAIL because executor/runtime do not yet accept external command registries.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/commands/executor.ts
import { parseExternalCommandActionId } from "@/core/commands/external-command-types";

type ExternalCommandRegistryLike = {
  refresh?: () => Promise<void>;
  getProvider: (providerId: string) => ExternalCommandProvider | null;
};

case "external-plugin-command": {
  const parsed = parseExternalCommandActionId(item.actionId);
  if (!parsed) {
    await this.options.notify?.(`外部命令配置无效：${item.actionId}`, "error");
    return;
  }

  let provider = this.options.externalCommands?.getProvider(parsed.providerId) || null;
  if (!provider) {
    await this.options.externalCommands?.refresh?.();
    provider = this.options.externalCommands?.getProvider(parsed.providerId) || null;
  }
  if (!provider) {
    await this.options.notify?.(`未检测到外部插件：${parsed.providerId}`, "error");
    return;
  }

  const result = await provider.invokeCommand(parsed.commandId, {
    trigger: "button-click",
    sourcePlugin: "siyuan-power-buttons",
    surface: item.surface,
    buttonId: item.id,
  });

  if (!result.ok && !result.alreadyNotified) {
    await this.options.notify?.(result.message || `外部命令执行失败：${parsed.commandId}`, "error");
  }
  if (result.ok && result.message && !result.alreadyNotified) {
    await this.options.notify?.(result.message, "info");
  }
  return;
}

// src/core/runtime/plugin-runtime.ts
private async buildExternalCommandProviders(): Promise<SettingsAppProps["externalCommandProviders"]> {
  return Promise.all(this.options.externalCommands.listProviders().map(async provider => ({
    ...provider,
    commands: await this.options.externalCommands.listCommands(provider.providerId),
  })));
}

private async createSettingsAppProps(): Promise<SettingsAppProps> {
  return {
    initialConfig: this.options.configStore.snapshot(),
    builtinCommands: this.options.builtinCommands,
    pluginCommands: this.options.pluginCommands,
    externalCommandProviders: await this.buildExternalCommandProviders(),
    onRefreshExternalCommands: async () => {
      await this.options.externalCommands.refresh();
      return this.buildExternalCommandProviders();
    },
    onChange: async config => this.options.configStore.replace(config as TConfig),
    onNotify: (message, type = "info") => this.options.showMessage(message, 4000, type),
    onReadCurrentLayout: this.options.readCurrentLayout,
  };
}

async openSetting(): Promise<void> {
  this.options.settingsDialog.open(await this.createSettingsAppProps());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/command-executor.test.ts tests/plugin-runtime.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/commands/executor.ts src/index.ts src/core/runtime/plugin-runtime.ts tests/command-executor.test.ts tests/plugin-runtime.test.ts
git commit -m "feat: execute external provider commands"
```

### Task 5: Add external provider selection UI to the `power-buttons` settings app

**Files:**
- Modify: `src/features/settings/use-settings-controller.ts`
- Modify: `src/App.vue`
- Test: `tests/settings-app-layout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("renders provider and command selectors for external plugin commands", async () => {
  const target = document.createElement("div");
  document.body.appendChild(target);

  const unmount = mountSettingsApp(target, {
    initialConfig: createDefaultConfig(),
    builtinCommands: [],
    pluginCommands: [],
    externalCommandProviders: [
      {
        providerId: "siyuan-doc-assist",
        providerName: "文档助手 / Doc Assist",
        commands: [{ id: "insert-doc-summary", title: "插入文档摘要", description: "在当前文档插入摘要" }],
      },
    ],
    onChange: vi.fn(),
    onNotify: vi.fn(),
    onRefreshExternalCommands: vi.fn().mockResolvedValue([]),
    onReadCurrentLayout: vi.fn().mockResolvedValue([]),
  });

  await nextTick();

  const actionTypeSelect = Array.from(target.querySelectorAll<HTMLSelectElement>(".settings-panel--editor select.b3-select"))
    .find(select => Array.from(select.options).some(option => option.value === "external-plugin-command"));
  expect(actionTypeSelect).not.toBeNull();

  actionTypeSelect!.value = "external-plugin-command";
  actionTypeSelect!.dispatchEvent(new Event("change"));
  await nextTick();

  const labels = Array.from(target.querySelectorAll(".settings-panel--editor label")).map(node => node.textContent?.trim());
  expect(labels.some(text => text?.includes("外部插件"))).toBe(true);
  expect(target.textContent).toContain("插入文档摘要");

  unmount();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/settings-app-layout.test.ts`
Expected: FAIL because the settings UI does not render external provider fields.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/settings/use-settings-controller.ts
const externalCommandProviders = ref(props.externalCommandProviders || []);

const selectedExternalProvider = computed(() => {
  if (!selectedItem.value || selectedItem.value.actionType !== "external-plugin-command") {
    return null;
  }
  const parsed = parseExternalCommandActionId(selectedItem.value.actionId);
  return parsed
    ? externalCommandProviders.value.find(provider => provider.providerId === parsed.providerId) || null
    : null;
});

const selectedExternalCommand = computed(() => {
  const parsed = selectedItem.value ? parseExternalCommandActionId(selectedItem.value.actionId) : null;
  if (!parsed) {
    return null;
  }
  return selectedExternalProvider.value?.commands.find(command => command.id === parsed.commandId) || null;
});

async function refreshExternalProviders(): Promise<void> {
  if (!props.onRefreshExternalCommands) return;
  externalCommandProviders.value = await props.onRefreshExternalCommands();
}

async function setSelectedExternalProvider(providerId: string): Promise<void> {
  const provider = externalCommandProviders.value.find(item => item.providerId === providerId);
  const commandId = provider?.commands[0]?.id || "__unset__";
  if (selectedItem.value) {
    selectedItem.value.actionId = formatExternalCommandActionId(providerId, commandId);
    await persist();
  }
}

async function setSelectedExternalCommand(commandId: string): Promise<void> {
  const parsed = selectedItem.value ? parseExternalCommandActionId(selectedItem.value.actionId) : null;
  if (selectedItem.value && parsed) {
    selectedItem.value.actionId = formatExternalCommandActionId(parsed.providerId, commandId);
    await persist();
  }
}

// src/App.vue
<label v-else-if="selectedItem.actionType === 'external-plugin-command'">
  <span>外部插件</span>
  <select
    class="b3-select"
    :value="selectedExternalProvider?.providerId || ''"
    @change="setSelectedExternalProvider(($event.target as HTMLSelectElement).value)"
  >
    <option v-for="provider in externalCommandProviders" :key="provider.providerId" :value="provider.providerId">
      {{ provider.providerName }}
    </option>
  </select>
</label>
<label v-if="selectedItem.actionType === 'external-plugin-command'">
  <span>外部命令</span>
  <select
    class="b3-select"
    :value="selectedExternalCommand?.id || ''"
    @change="setSelectedExternalCommand(($event.target as HTMLSelectElement).value)"
  >
    <option
      v-for="command in selectedExternalProvider?.commands || []"
      :key="command.id"
      :value="command.id"
    >
      {{ command.title }}
    </option>
  </select>
</label>
<p v-if="selectedItem.actionType === 'external-plugin-command' && selectedExternalCommand">
  {{ selectedExternalCommand.description || '由外部插件负责解析当前上下文并执行。' }}
</p>
<button
  v-if="selectedItem.actionType === 'external-plugin-command'"
  class="b3-button b3-button--outline"
  type="button"
  @click="refreshExternalProviders"
>
  刷新外部命令
</button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/settings-app-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/use-settings-controller.ts src/App.vue tests/settings-app-layout.test.ts
git commit -m "feat: add external provider selectors to settings"
```

### Task 6: Implement the provider whitelist module in `siyuan-doc-assist`

**Files:**
- Create: `D:/MyCodingProjects/siyuan-doc-assist/src/plugin/power-buttons-provider-types.ts`
- Create: `D:/MyCodingProjects/siyuan-doc-assist/src/plugin/power-buttons-provider.ts`
- Test: `D:/MyCodingProjects/siyuan-doc-assist/tests/power-buttons-provider.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createPowerButtonsProvider } from "@/plugin/power-buttons-provider";

describe("power buttons provider", () => {
  it("lists only explicit public commands", async () => {
    const provider = createPowerButtonsProvider({
      pluginVersion: "1.4.5",
      runAction: vi.fn(),
    });

    const commands = await provider.listCommands();

    expect(commands.map(command => command.id)).toContain("insert-doc-summary");
    expect(commands.map(command => command.id)).toContain("clean-ai-output");
    expect(commands.map(command => command.id)).not.toContain("create-monthly-diary");
  });

  it("routes public commands to runAction and rejects unknown commands", async () => {
    const runAction = vi.fn().mockResolvedValue(undefined);
    const provider = createPowerButtonsProvider({
      pluginVersion: "1.4.5",
      runAction,
    });

    const ok = await provider.invokeCommand("insert-doc-summary", {
      trigger: "button-click",
      sourcePlugin: "siyuan-power-buttons",
    });
    const missing = await provider.invokeCommand("missing-command", {
      trigger: "button-click",
      sourcePlugin: "siyuan-power-buttons",
    });

    expect(runAction).toHaveBeenCalledWith("insert-doc-summary");
    expect(ok).toEqual({ ok: true, alreadyNotified: true });
    expect(missing).toEqual(expect.objectContaining({
      ok: false,
      errorCode: "command-not-found",
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/power-buttons-provider.test.ts`
Workdir: `D:/MyCodingProjects/siyuan-doc-assist`
Expected: FAIL because the provider module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// D:/MyCodingProjects/siyuan-doc-assist/src/plugin/power-buttons-provider-types.ts
export interface PowerButtonsInvokeContext {
  trigger: "button-click";
  sourcePlugin: "siyuan-power-buttons";
  sourcePluginVersion?: string;
  surface?: string;
  buttonId?: string;
}

export interface PowerButtonsInvokeResult {
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

export interface PowerButtonsPublicCommand {
  id: string;
  title: string;
  description?: string;
  category?: string;
  desktopOnly?: boolean;
}

export interface PowerButtonsCommandProvider {
  protocol: "power-buttons-command-provider";
  protocolVersion: 1;
  providerId: string;
  providerName: string;
  providerVersion?: string;
  listCommands: () => Promise<PowerButtonsPublicCommand[]> | PowerButtonsPublicCommand[];
  invokeCommand: (
    commandId: string,
    context: PowerButtonsInvokeContext,
  ) => Promise<PowerButtonsInvokeResult> | PowerButtonsInvokeResult;
}

// D:/MyCodingProjects/siyuan-doc-assist/src/plugin/power-buttons-provider.ts
import { ACTIONS, type ActionKey } from "@/plugin/actions";
import { filterVisibleActions } from "@/plugin/alpha-feature-config";

const PUBLIC_ACTION_KEYS: ActionKey[] = [
  "export-current",
  "export-child-docs-zip",
  "export-child-key-info-zip",
  "insert-backlinks",
  "insert-child-docs",
  "create-open-docs-summary",
  "clean-ai-output",
  "trim-trailing-whitespace",
  "remove-extra-blank-lines",
  "toggle-links-refs",
  "insert-doc-summary",
];

export function createPowerButtonsProvider(options: {
  pluginVersion: string;
  runAction: (action: ActionKey) => Promise<void>;
}): PowerButtonsCommandProvider {
  const publicActions = filterVisibleActions(ACTIONS).filter(action => PUBLIC_ACTION_KEYS.includes(action.key));
  const publicActionMap = new Map(publicActions.map(action => [action.key, action] as const));

  return {
    protocol: "power-buttons-command-provider",
    protocolVersion: 1,
    providerId: "siyuan-doc-assist",
    providerName: "文档助手 / Doc Assist",
    providerVersion: options.pluginVersion,
    listCommands: () => publicActions.map(action => ({
      id: action.key,
      title: action.commandText,
      description: action.tooltip,
      category: action.group,
      desktopOnly: action.desktopOnly,
    })),
    invokeCommand: async (commandId) => {
      const action = publicActionMap.get(commandId as ActionKey);
      if (!action) {
        return {
          ok: false,
          errorCode: "command-not-found",
          message: `未找到公开命令：${commandId}`,
        };
      }

      await options.runAction(action.key);
      return { ok: true, alreadyNotified: true };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/power-buttons-provider.test.ts`
Workdir: `D:/MyCodingProjects/siyuan-doc-assist`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C D:/MyCodingProjects/siyuan-doc-assist add src/plugin/power-buttons-provider-types.ts src/plugin/power-buttons-provider.ts tests/power-buttons-provider.test.ts
git -C D:/MyCodingProjects/siyuan-doc-assist commit -m "feat: expose doc assist power buttons provider"
```

### Task 7: Expose the provider from `siyuan-doc-assist` plugin lifecycle and verify discovery contract

**Files:**
- Modify: `D:/MyCodingProjects/siyuan-doc-assist/src/plugin/plugin-lifecycle.ts`
- Modify: `D:/MyCodingProjects/siyuan-doc-assist/tests/plugin-menu-registration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("exposes a power-buttons integration provider from the plugin instance", async () => {
  const { default: DocLinkToolkitPlugin } = await import("@/plugin/plugin-lifecycle");
  const plugin = new DocLinkToolkitPlugin() as any;

  await plugin.onload();

  const provider = plugin.getPowerButtonsIntegration?.();

  expect(provider).toEqual(expect.objectContaining({
    protocol: "power-buttons-command-provider",
    protocolVersion: 1,
    providerId: "siyuan-doc-assist",
  }));
  expect(await provider.listCommands()).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: "insert-doc-summary" })]),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/plugin-menu-registration.test.ts tests/power-buttons-provider.test.ts`
Workdir: `D:/MyCodingProjects/siyuan-doc-assist`
Expected: FAIL because the lifecycle class does not expose `getPowerButtonsIntegration()`.

- [ ] **Step 3: Write minimal implementation**

```ts
// D:/MyCodingProjects/siyuan-doc-assist/src/plugin/plugin-lifecycle.ts
import {
  createPowerButtonsProvider,
  type PowerButtonsCommandProvider,
} from "@/plugin/power-buttons-provider";

export default class DocLinkToolkitPlugin extends Plugin {
  private readonly powerButtonsProvider: PowerButtonsCommandProvider = createPowerButtonsProvider({
    pluginVersion: this.version,
    runAction: (action) => this.actionRunner.runAction(action),
  });

  public getPowerButtonsIntegration(): PowerButtonsCommandProvider | null {
    return this.powerButtonsProvider;
  }
}
```

Keep the provider field near other lifecycle-owned collaborators so it is created once per plugin instance.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/plugin-menu-registration.test.ts tests/power-buttons-provider.test.ts`
Workdir: `D:/MyCodingProjects/siyuan-doc-assist`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C D:/MyCodingProjects/siyuan-doc-assist add src/plugin/plugin-lifecycle.ts tests/plugin-menu-registration.test.ts
git -C D:/MyCodingProjects/siyuan-doc-assist commit -m "feat: publish doc assist provider from lifecycle"
```

### Task 8: Run final verification in both repos and refresh docs

**Files:**
- Modify: `docs/project-structure.md`
- Modify: `D:/MyCodingProjects/siyuan-doc-assist/docs/project-structure.md`
- Test: `tests/command-executor.test.ts`
- Test: `tests/settings-app-layout.test.ts`
- Test: `D:/MyCodingProjects/siyuan-doc-assist/tests/power-buttons-provider.test.ts`
- Test: `D:/MyCodingProjects/siyuan-doc-assist/tests/plugin-menu-registration.test.ts`

- [ ] **Step 1: Refresh the structure docs**

```md
// docs/project-structure.md
- `src/core/commands/external-command-types.ts`：跨插件 provider 协议类型、actionId 编解码工具
- `src/core/commands/external-command-registry.ts`：已安装插件 provider 发现、缓存与查询

// D:/MyCodingProjects/siyuan-doc-assist/docs/project-structure.md
- `src/plugin/power-buttons-provider.ts`：`power-buttons` 集成白名单与 provider 调用路由
- `src/plugin/power-buttons-provider-types.ts`：跨插件 provider 协议类型
```

- [ ] **Step 2: Run focused verification**

Run: `npm test -- tests/config-item-defaults.test.ts tests/external-command-types.test.ts tests/external-command-registry.test.ts tests/settings-action-config.test.ts tests/command-executor.test.ts tests/settings-app-layout.test.ts tests/plugin-runtime.test.ts`
Workdir: `D:/MyCodingProjects/siyuan-power-buttons`
Expected: PASS

Run: `npm test -- tests/power-buttons-provider.test.ts tests/plugin-menu-registration.test.ts`
Workdir: `D:/MyCodingProjects/siyuan-doc-assist`
Expected: PASS

- [ ] **Step 3: Run full verification**

Run: `npm test`
Workdir: `D:/MyCodingProjects/siyuan-power-buttons`
Expected: PASS

Run: `npm test`
Workdir: `D:/MyCodingProjects/siyuan-doc-assist`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add docs/project-structure.md
git commit -m "docs: record external provider architecture"

git -C D:/MyCodingProjects/siyuan-doc-assist add docs/project-structure.md
git -C D:/MyCodingProjects/siyuan-doc-assist commit -m "docs: record power buttons provider module"
```
