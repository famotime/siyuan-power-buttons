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
    expect(listTitles.slice(0, 3)).toEqual(["全局搜索", "插件设置", "大纲"]);

    unmount();
  });

  it("replaces the icon source select with tabs and offers common emoji picks", async () => {
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

    const iconTabs = Array.from(target.querySelectorAll("button"))
      .filter(button => ["内置图标", "Emoji", "SVG"].includes(button.textContent?.trim() || ""));
    const emojiTab = iconTabs.find(button => button.textContent?.trim() === "Emoji");

    expect(target.textContent).not.toContain("图标来源");
    expect(iconTabs).toHaveLength(3);

    emojiTab?.click();
    await nextTick();

    const emojiOptions = Array.from(target.querySelectorAll(".emoji-grid__item"))
      .map(button => button.textContent?.trim());

    expect(emojiOptions.length).toBeGreaterThan(6);
    expect(emojiOptions).toContain("⚡");
    expect(emojiOptions).toContain("🔍");
    expect(emojiOptions).toContain("⚙️");

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
    expect(sidebarToggles).toHaveLength(3);

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

    expect(onChange).toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith("配置文件已导入。");
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
});
