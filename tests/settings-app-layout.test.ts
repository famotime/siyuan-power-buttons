// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { nextTick } from "vue";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  createDefaultConfig,
} from "@/core/config";
import { createButtonItem } from "@/core/config/defaults";
import { mountSettingsApp } from "@/main";

describe("settings app layout", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("does not render a separate current preview card in the editor panel", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    expect(target.textContent).not.toContain("当前预览");
    expect(target.querySelector(".preview-card")).toBeNull();

    unmount();
  });

  it("moves the preview gradient styling to the active button list item", () => {
    const stylesheet = readFileSync(resolve(process.cwd(), "src/index.scss"), "utf8");

    const activeRuleStart = stylesheet.indexOf(".button-list__item.is-active");
    const activeRuleEnd = stylesheet.indexOf("}", activeRuleStart);
    const activeRule = stylesheet.slice(activeRuleStart, activeRuleEnd);

    expect(activeRule).toContain("linear-gradient(135deg");
    expect(stylesheet).not.toContain(".preview-card {");
  });

  it("keeps button list items within the sidebar card width", () => {
    const stylesheet = readFileSync(resolve(process.cwd(), "src/index.scss"), "utf8");

    const itemRuleStart = stylesheet.indexOf(".button-list__item {");
    const itemRuleEnd = stylesheet.indexOf("}", itemRuleStart);
    const itemRule = stylesheet.slice(itemRuleStart, itemRuleEnd);

    expect(itemRule).toContain("width: 100%");
    expect(itemRule).toContain("box-sizing: border-box");
  });

  it("keeps new and duplicate actions together in the button list panel and removes the experimental toggles card", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const sidebarTitle = target.querySelector(".settings-panel--sidebar .panel-title");
    const headerActions = target.querySelector(".settings-header__actions");
    const listTitles = Array.from(target.querySelectorAll(".button-list__content strong"))
      .map(node => node.textContent?.trim());

    expect(sidebarTitle?.textContent).toContain("复制");
    expect(sidebarTitle?.textContent).toContain("新建");
    expect(headerActions?.textContent).toContain("恢复默认");
    expect(headerActions?.textContent).not.toContain("新建");
    expect(target.textContent).not.toContain("实验功能");
    expect(listTitles.slice(0, 2)).toEqual(["全局搜索", "大纲"]);

    unmount();
  });

  it("selects the clicked button list item without throwing", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const listButtons = Array.from(target.querySelectorAll<HTMLButtonElement>(".button-list__main"));
    expect(listButtons).toHaveLength(2);

    listButtons[1]?.click();
    await nextTick();

    const activeItem = target.querySelector(".button-list__item.is-active strong");
    const editorTitle = target.querySelector(".settings-panel--editor .panel-title p");

    expect(activeItem?.textContent?.trim()).toBe("大纲");
    expect(editorTitle?.textContent).toContain("大纲");

    unmount();
  });

  it("renders the icon source switcher as standard tabs and offers common emoji picks", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const iconTablist = target.querySelector('[role="tablist"][aria-label="图标类型"]');
    const iconTabs = Array.from(iconTablist?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const builtinTab = iconTabs.find(button => button.textContent?.trim() === "内置图标");
    const emojiTab = iconTabs.find(button => button.textContent?.trim() === "Emoji");

    expect(target.textContent).not.toContain("图标来源");
    expect(iconTablist).not.toBeNull();
    expect(iconTabs).toHaveLength(3);
    expect(builtinTab?.getAttribute("role")).toBe("tab");
    expect(emojiTab?.getAttribute("role")).toBe("tab");
    expect(builtinTab?.getAttribute("aria-selected")).toBe("true");
    expect(emojiTab?.getAttribute("aria-selected")).toBe("false");
    expect(target.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby")).toBe(builtinTab?.id);

    emojiTab?.click();
    await nextTick();

    expect(emojiTab?.getAttribute("aria-selected")).toBe("true");
    expect(target.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby")).toBe(emojiTab?.id);

    const emojiOptions = Array.from(target.querySelectorAll(".emoji-grid__item"))
      .map(button => button.textContent?.trim());

    expect(emojiOptions.length).toBeGreaterThan(6);
    expect(emojiOptions).toContain("⚡");
    expect(emojiOptions).toContain("🔍");
    expect(emojiOptions).toContain("⚙️");

    unmount();
  });

  it("keeps the experimental shortcut input empty by default and uses placeholder guidance", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange,
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const actionTypeSelect = Array.from(target.querySelectorAll<HTMLSelectElement>(".settings-panel--editor select.b3-select"))
      .find(select => Array.from(select.options).some(option => option.value === "experimental-shortcut"));
    expect(actionTypeSelect).not.toBeNull();

    actionTypeSelect!.value = "experimental-shortcut";
    actionTypeSelect!.dispatchEvent(new Event("change"));
    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const shortcutInput = Array.from(target.querySelectorAll<HTMLInputElement>(".settings-panel--editor input.b3-text-field"))
      .find(input => input.placeholder.includes("Ctrl+B / Alt+5"));

    expect(shortcutInput).not.toBeUndefined();
    expect(shortcutInput?.value).toBe("");
    expect(shortcutInput?.placeholder).toBe("例如：Ctrl+B / Alt+5");
    expect(shortcutInput?.readOnly).toBe(true);
    expect(onChange).toHaveBeenCalled();

    unmount();
  });

  it("initializes experimental action configs immediately when switching action type", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);
    const onNotify = vi.fn();

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange,
      onNotify,
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const actionTypeSelect = Array.from(target.querySelectorAll<HTMLSelectElement>(".settings-panel--editor select.b3-select"))
      .find(select => Array.from(select.options).some(option => option.value === "experimental-shortcut"));
    expect(actionTypeSelect).not.toBeNull();

    actionTypeSelect!.value = "experimental-shortcut";
    actionTypeSelect!.dispatchEvent(new Event("change"));
    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const shortcutInput = Array.from(target.querySelectorAll<HTMLInputElement>(".settings-panel--editor input.b3-text-field"))
      .find(input => input.placeholder.includes("Ctrl+B / Alt+5"));
    expect(shortcutInput).not.toBeUndefined();
    expect(onNotify).not.toHaveBeenCalledWith(expect.stringMatching(/TypeError/), "error");

    actionTypeSelect!.value = "experimental-click-sequence";
    actionTypeSelect!.dispatchEvent(new Event("change"));
    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    expect(target.textContent).toContain("点击步骤");
    expect(target.textContent).toContain("步骤 1");

    unmount();
  });

  it("captures shortcut combinations directly from keyboard input", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);
    const initialConfig = createDefaultConfig();
    initialConfig.items = [
      createButtonItem({
        id: "capture-shortcut",
        title: "加粗",
        actionType: "experimental-shortcut",
        actionId: "",
        tooltip: "实验快捷键",
        experimentalShortcut: {
          shortcut: "",
          sendEscapeBefore: false,
          dispatchTarget: "auto",
          allowDirectWindowDispatch: false,
        },
      }),
    ];

    const unmount = mountSettingsApp(target, {
      initialConfig,
      builtinCommands: [],
      pluginCommands: [],
      onChange,
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const shortcutInput = Array.from(target.querySelectorAll<HTMLInputElement>(".settings-panel--editor input.b3-text-field"))
      .find(input => input.placeholder.includes("Ctrl+B / Alt+5"));

    expect(shortcutInput).not.toBeUndefined();

    shortcutInput?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "b",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }));
    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    expect(shortcutInput?.value).toBe("Ctrl+Shift+B");
    const latestConfig = onChange.mock.calls.at(-1)?.[0];
    expect(latestConfig?.items[0].experimentalShortcut?.shortcut).toBe("Ctrl+Shift+B");
    expect(latestConfig?.items[0].actionId).toBe("Ctrl+Shift+B");

    unmount();
  });

  it("blocks duplicate shortcut combinations and shows a conflict message", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);
    const onNotify = vi.fn();
    const initialConfig = createDefaultConfig();
    initialConfig.items = [
      createButtonItem({
        id: "editing-shortcut",
        title: "待设置按钮",
        actionType: "experimental-shortcut",
        actionId: "",
        tooltip: "实验快捷键",
        experimentalShortcut: {
          shortcut: "",
          sendEscapeBefore: false,
          dispatchTarget: "auto",
          allowDirectWindowDispatch: false,
        },
      }),
      createButtonItem({
        id: "occupied-shortcut",
        title: "已占用按钮",
        actionType: "experimental-shortcut",
        actionId: "Ctrl+B",
        tooltip: "实验快捷键",
        experimentalShortcut: {
          shortcut: "Ctrl+B",
          sendEscapeBefore: false,
          dispatchTarget: "auto",
          allowDirectWindowDispatch: false,
        },
      }),
    ];

    const unmount = mountSettingsApp(target, {
      initialConfig,
      builtinCommands: [],
      pluginCommands: [],
      onChange,
      onNotify,
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const shortcutInput = Array.from(target.querySelectorAll<HTMLInputElement>(".settings-panel--editor input.b3-text-field"))
      .find(input => input.placeholder.includes("Ctrl+B / Alt+5"));

    shortcutInput?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "b",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    expect(shortcutInput?.value).toBe("");
    expect(onChange).not.toHaveBeenCalled();
    expect(target.textContent).toContain("快捷键 Ctrl+B 已被按钮「已占用按钮」使用");
    expect(onNotify).toHaveBeenCalledWith("快捷键 Ctrl+B 已被按钮「已占用按钮」使用。", "error");

    unmount();
  });

  it("removes the duplicate custom action menu item from the action type selector", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [
        {
          id: "open-settings",
          title: "打开插件设置",
          description: "打开设置面板",
        },
      ],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const actionTypeSelect = Array.from(target.querySelectorAll<HTMLSelectElement>(".settings-panel--editor select.b3-select"))
      .find(select => Array.from(select.options).some(option => option.value === "plugin-command"));

    expect(actionTypeSelect).not.toBeNull();
    expect(Array.from(actionTypeSelect!.options).map(option => option.value)).not.toContain("custom-action");
    expect(Array.from(actionTypeSelect!.options).map(option => option.textContent?.trim())).not.toContain("插件动作");
    expect(target.textContent).toContain("插件命令");

    unmount();
  });

  it("removes the open url action type from the settings selector", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const actionTypeSelect = Array.from(target.querySelectorAll<HTMLSelectElement>(".settings-panel--editor select.b3-select"))
      .find(select => Array.from(select.options).some(option => option.value === "plugin-command"));

    expect(actionTypeSelect).not.toBeNull();
    expect(Array.from(actionTypeSelect!.options).map(option => option.value)).not.toContain("open-url");
    expect(Array.from(actionTypeSelect!.options).map(option => option.textContent?.trim())).not.toContain("打开链接");
    expect(target.textContent).not.toContain("目标链接");

    unmount();
  });

  it("removes the editor visibility switch and keeps list visibility toggles", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const editorPanel = target.querySelector(".settings-panel--editor");
    const sidebarToggles = target.querySelectorAll(".settings-panel--sidebar .switch-button--compact");

    expect(editorPanel?.textContent).not.toContain("显示状态");
    expect(sidebarToggles).toHaveLength(2);

    unmount();
  });

  it("renders provider and command selectors for external plugin commands", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      externalCommandProviders: [
        {
          providerId: "siyuan-doc-assist",
          providerName: "文档助手 / Doc Assist",
          commands: [
            {
              id: "insert-doc-summary",
              title: "插入文档摘要",
              description: "在当前文档插入摘要",
            },
          ],
        },
      ],
      onChange,
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
    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const labels = Array.from(target.querySelectorAll(".settings-panel--editor label"))
      .map(node => node.textContent?.trim());

    expect(labels.some(text => text?.includes("外部插件"))).toBe(true);
    expect(labels.some(text => text?.includes("外部命令"))).toBe(true);
    expect(target.textContent).toContain("插入文档摘要");
    expect(target.textContent).toContain("在当前文档插入摘要");
    expect(onChange).toHaveBeenCalled();

    unmount();
  });

  it("refreshes external command options from the provider callback", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const initialConfig = createDefaultConfig();
    initialConfig.items = [
      createButtonItem({
        id: "external-command",
        title: "文档摘要",
        actionType: "external-plugin-command" as never,
        actionId: "siyuan-doc-assist:insert-doc-summary",
      }),
    ];

    const onRefreshExternalCommands = vi.fn().mockResolvedValue([
      {
        providerId: "siyuan-doc-assist",
        providerName: "文档助手 / Doc Assist",
        commands: [
          {
            id: "insert-doc-summary",
            title: "插入最新文档摘要",
            description: "刷新后的命令描述",
          },
        ],
      },
    ]);

    const unmount = mountSettingsApp(target, {
      initialConfig,
      builtinCommands: [],
      pluginCommands: [],
      externalCommandProviders: [
        {
          providerId: "siyuan-doc-assist",
          providerName: "文档助手 / Doc Assist",
          commands: [
            {
              id: "insert-doc-summary",
              title: "旧摘要命令",
              description: "旧描述",
            },
          ],
        },
      ],
      onChange: vi.fn().mockResolvedValue(undefined),
      onNotify: vi.fn(),
      onRefreshExternalCommands,
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const refreshButton = Array.from(target.querySelectorAll<HTMLButtonElement>(".settings-panel--editor button"))
      .find(button => button.textContent?.trim() === "刷新外部命令");

    expect(target.textContent).toContain("旧摘要命令");
    expect(refreshButton).not.toBeUndefined();

    refreshButton?.click();
    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    expect(onRefreshExternalCommands).toHaveBeenCalledTimes(1);
    expect(target.textContent).toContain("插入最新文档摘要");
    expect(target.textContent).toContain("刷新后的命令描述");
    expect(target.textContent).not.toContain("旧摘要命令");

    unmount();
  });

  it("keeps the reserved external placeholder when selecting a provider without public commands", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);
    const initialConfig = createDefaultConfig();
    initialConfig.items = [
      createButtonItem({
        id: "external-empty-provider",
        title: "空命令提供者",
        actionType: "external-plugin-command" as never,
        actionId: "siyuan-doc-assist:insert-doc-summary",
      }),
    ];

    const unmount = mountSettingsApp(target, {
      initialConfig,
      builtinCommands: [],
      pluginCommands: [],
      externalCommandProviders: [
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
        {
          providerId: "empty-provider",
          providerName: "空提供者",
          commands: [],
        },
      ],
      onChange,
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const providerSelect = Array.from(target.querySelectorAll<HTMLSelectElement>(".settings-panel--editor select.b3-select"))
      .find(select => Array.from(select.options).some(option => option.value === "empty-provider"));

    expect(providerSelect).not.toBeNull();

    providerSelect!.value = "empty-provider";
    providerSelect!.dispatchEvent(new Event("change"));
    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const latestConfig = onChange.mock.calls.at(-1)?.[0];
    expect(latestConfig?.items[0].actionId).toBe("__external__:__unset__");

    unmount();
  });

  it("moves config import and export to the sidebar and removes json textarea tools", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const sidebarTransfer = target.querySelector(".settings-panel--sidebar .config-transfer");
    const editorTransfer = target.querySelector(".settings-panel--editor .config-transfer");

    expect(sidebarTransfer?.textContent).toContain("导出配置文件");
    expect(sidebarTransfer?.textContent).toContain("导入配置文件");
    expect(sidebarTransfer?.textContent).toContain("所有已配置按钮");
    expect(editorTransfer).toBeNull();
    expect(target.textContent).not.toContain("复制 JSON");
    expect(target.textContent).not.toContain("导出到文本框");
    expect(target.textContent).not.toContain("从文本框导入");
    expect(target.querySelector(".json-tools")).toBeNull();

    unmount();
  });

  it("imports and exports the full button configuration through files", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);
    const onNotify = vi.fn();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange,
      onNotify,
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await nextTick();

    const exportButton = Array.from(target.querySelectorAll("button"))
      .find(button => button.textContent?.trim() === "导出配置文件");
    exportButton?.click();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    const exportedBlob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(exportedBlob.type).toContain("application/json");
    expect(exportedBlob.size).toBeGreaterThan(0);

    const importedConfig = createDefaultConfig();
    importedConfig.items = [
      createButtonItem({
        id: "imported-only",
        title: "导入后的按钮",
        tooltip: "来自文件导入",
        order: 0,
      }),
    ];

    const fileInput = target.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [new File([JSON.stringify(importedConfig)], "power-buttons.json", { type: "application/json" })],
    });

    fileInput?.dispatchEvent(new Event("change"));
    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      expect(onNotify).toHaveBeenCalledWith("配置文件已导入。");
    });
    expect(Array.from(target.querySelectorAll(".button-list__content strong")).map(node => node.textContent?.trim())).toEqual(["导入后的按钮"]);

    unmount();
  });

  it("renders native canvas pin controls at the top-left of the editor preview and keeps dock sections separated", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([
        {
          id: "native-canvas-pin",
          title: "钉住编辑区",
          visible: true,
          surface: "canvas",
          order: 0,
          editable: false,
          source: "native",
          iconMarkup: "<svg viewBox='0 0 24 24'><path d='M0 0h24v24H0z' /></svg>",
        },
      ]),
    });

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const canvasItems = target.querySelector(".workspace-preview__canvas-items");
    const canvasText = canvasItems?.textContent || "";
    const stylesheet = readFileSync(resolve(process.cwd(), "src/index.scss"), "utf8");

    expect(canvasText).toContain("钉住编辑区");
    expect(stylesheet).toContain(".workspace-preview__segment--end");
    expect(stylesheet).toContain("border-top: 1px dashed");
    expect(stylesheet).toContain("justify-content: flex-end");

    unmount();
  });

  it("forwards native preview chip clicks to the matched native toolbar element", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const nativeButton = document.createElement("button");
    nativeButton.id = "native-canvas-pin";
    nativeButton.type = "button";
    const nativeClick = vi.fn();
    nativeButton.addEventListener("click", nativeClick);
    document.body.appendChild(nativeButton);

    const onNotify = vi.fn();

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify,
      onReadCurrentLayout: vi.fn().mockResolvedValue([
        {
          id: "native-canvas-pin-preview",
          title: "钉住编辑区",
          visible: true,
          surface: "canvas",
          order: 0,
          editable: false,
          source: "native",
          iconMarkup: "<svg viewBox='0 0 24 24'><path d='M0 0h24v24H0z' /></svg>",
          nativeSelectors: ["#native-canvas-pin"],
        },
      ]),
    });

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const nativePreviewChip = target.querySelector(".workspace-preview__canvas-items .workspace-chip.is-native") as HTMLButtonElement;
    nativePreviewChip.click();

    expect(nativeClick).toHaveBeenCalledTimes(1);
    expect(onNotify).not.toHaveBeenCalledWith("原生按钮当前仅支持读取预览，暂不可直接编辑。");

    unmount();
    nativeButton.remove();
  });

  it("allows a user button to move into the editor canvas preview", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange,
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const topbarButton = target.querySelector(".workspace-preview__topbar .workspace-chip.is-draggable") as HTMLButtonElement;
    const canvasDropzone = target.querySelector(".workspace-preview__canvas-items") as HTMLElement;

    topbarButton.dispatchEvent(new Event("dragstart", { bubbles: true }));
    canvasDropzone.dispatchEvent(new Event("drop", { bubbles: true }));

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    expect(onChange).toHaveBeenCalled();
    const latestConfig = onChange.mock.calls.at(-1)?.[0];
    expect(latestConfig?.items.find((item: { title: string }) => item.title === "全局搜索")?.surface).toBe("canvas");

    unmount();
  });

  it("moves a native preview button into the disabled tray and persists the suppression rule", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange,
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([
        {
          id: "native-canvas-pin-preview",
          title: "钉住编辑区",
          visible: true,
          surface: "canvas",
          order: 0,
          editable: false,
          source: "native",
          iconMarkup: "<svg viewBox='0 0 24 24'><path d='M0 0h24v24H0z' /></svg>",
          nativeSelectors: ["#native-canvas-pin", "[data-type='readonly']"],
        },
      ]),
    });

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const nativeButton = target.querySelector(".workspace-preview__canvas-items .workspace-chip.is-native") as HTMLButtonElement;
    const disabledDropzone = target.querySelector(".workspace-preview__disabled-items") as HTMLElement;

    nativeButton.dispatchEvent(new Event("dragstart", { bubbles: true }));
    disabledDropzone.dispatchEvent(new Event("drop", { bubbles: true }));

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    expect(onChange).toHaveBeenCalled();
    const latestConfig = onChange.mock.calls.at(-1)?.[0];
    expect(latestConfig?.disabledNativeButtons).toEqual([
      {
        id: "native-canvas-pin-preview",
        title: "钉住编辑区",
        surface: "canvas",
        iconMarkup: "<svg viewBox='0 0 24 24'><path d='M0 0h24v24H0z' /></svg>",
        selectors: ["#native-canvas-pin", "[data-type='readonly']"],
      },
    ]);
    expect(target.querySelector(".workspace-preview__canvas-items")?.textContent).not.toContain("钉住编辑区");
    const disabledButton = target.querySelector(".workspace-preview__disabled-items .workspace-chip.is-suppressed") as HTMLButtonElement;
    expect(disabledButton).not.toBeNull();
    expect(disabledButton.getAttribute("aria-label")).toBe("钉住编辑区");

    unmount();
  });

  it("restores a disabled native button when it is dragged back to its original preview surface", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange,
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([
        {
          id: "native-canvas-pin-preview",
          title: "钉住编辑区",
          visible: true,
          surface: "canvas",
          order: 0,
          editable: false,
          source: "native",
          iconMarkup: "<svg viewBox='0 0 24 24'><path d='M0 0h24v24H0z' /></svg>",
          nativeSelectors: ["#native-canvas-pin", "[data-type='readonly']"],
        },
      ]),
    });

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const nativeButton = target.querySelector(".workspace-preview__canvas-items .workspace-chip.is-native") as HTMLButtonElement;
    const disabledDropzone = target.querySelector(".workspace-preview__disabled") as HTMLElement;

    nativeButton.dispatchEvent(new Event("dragstart", { bubbles: true }));
    disabledDropzone.dispatchEvent(new Event("drop", { bubbles: true }));

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const disabledButton = target.querySelector(".workspace-preview__disabled-items .workspace-chip.is-suppressed") as HTMLButtonElement;
    const canvasDropzone = target.querySelector(".workspace-preview__canvas-items") as HTMLElement;

    disabledButton.dispatchEvent(new Event("dragstart", { bubbles: true }));
    canvasDropzone.dispatchEvent(new Event("drop", { bubbles: true }));

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const latestConfig = onChange.mock.calls.at(-1)?.[0];
    expect(latestConfig?.disabledNativeButtons).toEqual([]);
    expect(target.querySelector(".workspace-preview__canvas-items")?.textContent).toContain("钉住编辑区");
    expect(target.querySelector(".workspace-preview__disabled-items")?.textContent).not.toContain("钉住编辑区");

    unmount();
  });

  it("writes drag data for preview chips so browser drag-and-drop can start reliably", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const topbarButton = target.querySelector(".workspace-preview__topbar .workspace-chip.is-draggable") as HTMLButtonElement;
    const setData = vi.fn();
    const dragStartEvent = new Event("dragstart", { bubbles: true });

    Object.defineProperty(dragStartEvent, "dataTransfer", {
      configurable: true,
      value: {
        effectAllowed: "all",
        setData,
      },
    });

    topbarButton.dispatchEvent(dragStartEvent);

    expect(setData).toHaveBeenCalledWith("text/plain", expect.any(String));

    unmount();
  });

  it("uses a single preview chip as the drag image for native buttons", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const unmount = mountSettingsApp(target, {
      initialConfig: createDefaultConfig(),
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([
        {
          id: "native-canvas-pin-preview",
          title: "钉住编辑区",
          visible: true,
          surface: "canvas",
          order: 0,
          editable: false,
          source: "native",
          iconMarkup: "<svg viewBox='0 0 24 24'><path d='M0 0h24v24H0z' /></svg>",
          nativeSelectors: ["#native-canvas-pin"],
        },
      ]),
    });

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const nativeButton = target.querySelector(".workspace-preview__canvas-items .workspace-chip.is-native") as HTMLButtonElement;
    const setData = vi.fn();
    const setDragImage = vi.fn();
    const dragStartEvent = new Event("dragstart", { bubbles: true });

    Object.defineProperty(dragStartEvent, "dataTransfer", {
      configurable: true,
      value: {
        effectAllowed: "all",
        setData,
        setDragImage,
      },
    });

    nativeButton.dispatchEvent(dragStartEvent);

    expect(setData).toHaveBeenCalledWith("text/plain", "native-canvas-pin-preview");
    expect(setDragImage).toHaveBeenCalledTimes(1);
    const [dragImage] = setDragImage.mock.calls[0] as [HTMLElement, number, number];
    expect(dragImage).toBeInstanceOf(HTMLElement);
    expect(dragImage.classList.contains("workspace-chip")).toBe(true);
    expect(dragImage.textContent?.replace(/\s+/g, " ").trim()).toBe("钉住编辑区");
    expect(dragImage.querySelectorAll(".workspace-chip").length).toBe(0);

    unmount();
  });

  it("renders a stable fallback icon for disabled native buttons instead of copied native svg markup", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const initialConfig = createDefaultConfig();
    initialConfig.disabledNativeButtons = [
      {
        id: "native-canvas-pin-preview",
        title: "钉住编辑区",
        surface: "canvas",
        selectors: ["#native-canvas-pin"],
        iconMarkup: "<svg viewBox='0 0 24 24'><use href='#iconPin'></use></svg>",
      },
    ];

    const unmount = mountSettingsApp(target, {
      initialConfig,
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const disabledButton = target.querySelector(".workspace-preview__disabled-items .workspace-chip.is-suppressed") as HTMLButtonElement;
    const fallbackIcon = disabledButton.querySelector(".siyuan-power-buttons__native-fallback-icon");

    expect(disabledButton.innerHTML).not.toContain("<use");
    expect(fallbackIcon).not.toBeNull();
    expect(fallbackIcon?.textContent?.trim()).toBe("钉");
    expect(disabledButton.querySelector(".workspace-chip__label")).toBeNull();

    unmount();
  });

  it("does not render text labels inside disabled tray buttons", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const initialConfig = createDefaultConfig();
    initialConfig.disabledNativeButtons = [
      {
        id: "native-mail-preview",
        title: "邮件",
        surface: "topbar",
        selectors: ["#barMail"],
        iconMarkup: "<svg viewBox='0 0 24 24'><path d='M1 1h22v22H1z'></path></svg>",
      },
    ];

    const unmount = mountSettingsApp(target, {
      initialConfig,
      builtinCommands: [],
      pluginCommands: [],
      onChange: vi.fn(),
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([]),
    });

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const disabledButton = target.querySelector(".workspace-preview__disabled-items .workspace-chip.is-suppressed") as HTMLButtonElement;

    expect(disabledButton.querySelector(".workspace-chip__label")).toBeNull();
    expect(disabledButton.textContent?.trim()).toBe("");
    expect(disabledButton.getAttribute("aria-label")).toBe("邮件");

    unmount();
  });

  it("restores a disabled native button when the restore x action is clicked", async () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const onChange = vi.fn().mockResolvedValue(undefined);
    const initialConfig = createDefaultConfig();
    initialConfig.disabledNativeButtons = [
      {
        id: "native-canvas-pin-preview",
        title: "钉住编辑区",
        surface: "canvas",
        selectors: ["#native-canvas-pin"],
        iconMarkup: "<svg viewBox='0 0 24 24'><path d='M1 1h22v22H1z'></path></svg>",
      },
    ];

    const unmount = mountSettingsApp(target, {
      initialConfig,
      builtinCommands: [],
      pluginCommands: [],
      onChange,
      onNotify: vi.fn(),
      onReadCurrentLayout: vi.fn().mockResolvedValue([
        {
          id: "native-canvas-pin-preview",
          title: "钉住编辑区",
          visible: true,
          surface: "canvas",
          order: 0,
          editable: false,
          source: "native",
          iconMarkup: "<svg viewBox='0 0 24 24'><path d='M1 1h22v22H1z'></path></svg>",
          nativeSelectors: ["#native-canvas-pin"],
        },
      ]),
    });

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const restoreButton = target.querySelector(".workspace-preview__disabled-items .workspace-chip__restore") as HTMLButtonElement;
    restoreButton.click();

    await new Promise(resolve => window.setTimeout(resolve, 20));
    await nextTick();

    const latestConfig = onChange.mock.calls.at(-1)?.[0];
    expect(latestConfig?.disabledNativeButtons).toEqual([]);
    expect(target.querySelector(".workspace-preview__disabled-items")?.textContent).not.toContain("钉住编辑区");
    expect(target.querySelector(".workspace-preview__canvas-items")?.textContent).toContain("钉住编辑区");

    unmount();
  });
});
