import { describe, expect, it } from "vitest";
import { createButtonItem, createDefaultConfig } from "@/core/config";
import {
  buildPreviewLayout,
  movePreviewItem,
} from "@/shared/preview-layout";

describe("preview layout", () => {
  it("maps configurable buttons into topbar and statusbar regions (merged to statusbar right)", () => {
    const layout = buildPreviewLayout([
      createButtonItem({
        id: "topbar-item",
        title: "最近文档",
        surface: "topbar",
        order: 0,
      }),
      createButtonItem({
        id: "statusbar-left-item",
        title: "今日日记",
        surface: "statusbar-left",
        order: 1,
      }),
    ]);

    expect(layout.topbar.length).toBe(1);
    expect(layout.statusbarLeft.length).toBe(0);
    expect(layout.statusbarRight.length).toBe(1);
    expect(layout.canvas.length).toBe(0);
  });

  it("maps a button with multiple surfaces into all corresponding regions", () => {
    const layout = buildPreviewLayout([
      createButtonItem({
        id: "multi-btn",
        title: "快捷操作",
        surfaces: ["topbar", "statusbar-right", "dock-panel"],
        order: 0,
      }),
    ]);

    expect(layout.topbar.length).toBe(1);
    expect(layout.statusbarRight.length).toBe(1);
    expect(layout.dockPanel.length).toBe(1);
    expect(layout.canvas.length).toBe(0);
  });

  it("keeps unknown regions empty and preserves button order", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "recent-docs",
        title: "最近文档",
        surface: "topbar",
        order: 0,
      }),
      createButtonItem({
        id: "go-back",
        title: "返回",
        actionId: "goBack",
        iconValue: "iconLeft",
        surface: "topbar",
        order: 99,
      }),
    ];

    const layout = buildPreviewLayout(config.items);

    expect(layout.topbar.map(item => item.title)).toEqual(["最近文档", "返回"]);
    expect(layout.bottomDockLeft.length).toBe(0);
  });

  it("can include hidden buttons in preview when requested", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "hidden-statusbar-item",
        title: "隐藏按钮",
        surface: "statusbar-right",
        visible: false,
        order: 0,
      }),
    ];

    const defaultLayout = buildPreviewLayout(config.items);
    const completeLayout = buildPreviewLayout(config.items, { includeHidden: true });

    expect(defaultLayout.statusbarRight).toHaveLength(0);
    expect(completeLayout.statusbarRight).toHaveLength(1);
    expect(completeLayout.statusbarRight[0].visible).toBe(false);
  });

  it("treats canvas as a configurable preview surface for user buttons", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "canvas-item",
        title: "最近文档",
        surface: "canvas",
        order: 0,
      }),
    ];

    const layout = buildPreviewLayout(config.items, { includeHidden: true });

    expect(layout.canvas.map(item => item.title)).toContain("最近文档");
    expect(layout.topbar).toHaveLength(0);
  });

  it("moves buttons across preview surfaces while preserving target order", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "recent-docs",
        title: "最近文档",
        surface: "topbar",
        order: 0,
      }),
      createButtonItem({
        id: "help",
        title: "帮助",
        actionId: "help",
        iconValue: "iconHelp",
        surface: "statusbar-right",
        order: 1,
      }),
    ];

    const moved = movePreviewItem(config.items, config.items[0].id, "statusbar-right", 1);
    const layout = buildPreviewLayout(moved, { includeHidden: true });

    expect(layout.topbar).toHaveLength(0);
    expect(layout.statusbarRight.map(item => item.title)).toEqual(["帮助", "最近文档"]);
  });

  it("maps and moves buttons into dock-panel layout region", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "side-panel-1",
        title: "面板按钮1",
        surface: "dock-panel",
        order: 0,
      }),
      createButtonItem({
        id: "side-panel-2",
        title: "面板按钮2",
        surface: "dock-panel",
        order: 1,
      }),
    ];

    const layout = buildPreviewLayout(config.items);
    expect(layout.dockPanel.map(item => item.title)).toEqual(["面板按钮1", "面板按钮2"]);

    const moved = movePreviewItem(config.items, "side-panel-2", "dock-panel", 0);
    const updatedLayout = buildPreviewLayout(moved);
    expect(updatedLayout.dockPanel.map(item => item.title)).toEqual(["面板按钮2", "面板按钮1"]);
  });
});
