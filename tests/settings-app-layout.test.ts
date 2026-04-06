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
import { createDefaultConfig } from "@/core/config";
import { mountSettingsApp } from "@/main";

describe("settings app layout", () => {
  afterEach(() => {
    document.body.innerHTML = "";
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
});
